import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { canUseFeature, getFeatureLimit } from "@/lib/features/service";
import { parseCsvForScena, mapEstadoToProgress, mapPrioridadToPriority } from "@/lib/scena/csv-parser";

export const dynamic = 'force-dynamic';

// Column color palette for imported phases
const COLUMN_COLORS = [
    { color: '#6366f1', cardColor: '#312e81' }, // Indigo
    { color: '#f59e0b', cardColor: '#78350f' }, // Amber
    { color: '#10b981', cardColor: '#064e3b' }, // Emerald
    { color: '#3b82f6', cardColor: '#1e3a5f' }, // Blue
    { color: '#ef4444', cardColor: '#7f1d1d' }, // Red
    { color: '#8b5cf6', cardColor: '#4c1d95' }, // Violet
    { color: '#ec4899', cardColor: '#831843' }, // Pink
    { color: '#14b8a6', cardColor: '#134e4a' }, // Teal
];

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { csvContent, projectName, description, projectId } = body;

        if (!csvContent) {
            return NextResponse.json({ error: "CSV content is required" }, { status: 400 });
        }

        if (!projectId && !projectName) {
            return NextResponse.json({ error: "Project name is required for new projects" }, { status: 400 });
        }

        // Check feature access
        const hasAccess = await canUseFeature(session.user.id, 'scenaAccess');
        const isSuperAdmin = (session.user as any).role === 'SUPERADMIN';
        if (!hasAccess && !isSuperAdmin) {
            return NextResponse.json({ error: "Tu plan no tiene acceso a Scena." }, { status: 403 });
        }

        // Parse CSV
        const result = parseCsvForScena(csvContent);

        if (result.errors.length > 0) {
            return NextResponse.json({
                error: "Errores de validación en el CSV",
                errors: result.errors,
                warnings: result.warnings,
            }, { status: 400 });
        }

        if (result.rows.length === 0) {
            return NextResponse.json({ error: "No se encontraron tareas válidas en el CSV" }, { status: 400 });
        }

        // Limit check: 1000 tasks max
        if (result.rows.length > 1000) {
            return NextResponse.json({ error: `Demasiadas tareas (${result.rows.length}). El máximo es 1,000.` }, { status: 400 });
        }

        let targetProjectId = projectId;

        // If importing to existing project, verify access
        if (targetProjectId) {
            const { verifyProjectAccess } = await import("@/lib/scena-auth");
            const access = await verifyProjectAccess(targetProjectId, session.user.id);
            const canEdit = access.isOwner || access.role === "EDITOR" || access.role === "ADMIN";
            if (!access.hasAccess || !canEdit) {
                return NextResponse.json({ error: "No tienes permisos para importar a este proyecto" }, { status: 403 });
            }
        } else {
            // Check project creation limits
            const limit = await getFeatureLimit(session.user.id, 'maxScenaProjects');
            if (limit !== null && limit !== -1 && !isSuperAdmin) {
                const count = await prisma.scenaProject.count({ where: { ownerId: session.user.id } });
                if (count >= limit) {
                    return NextResponse.json({
                        error: `Has alcanzado el límite de ${limit} proyectos de tu plan.`
                    }, { status: 403 });
                }
            }
        }

        // Execute import in transaction
        const importResult = await prisma.$transaction(async (tx) => {
            // 1. Create or get project
            let project: { id: string };

            if (targetProjectId) {
                project = { id: targetProjectId };
            } else {
                project = await tx.scenaProject.create({
                    data: {
                        name: projectName,
                        description: description,
                        ownerId: session.user!.id!,
                    }
                });
            }

            // 2. Get existing columns count (for ordering)
            let existingColumnCount = 0;
            if (targetProjectId) {
                existingColumnCount = await tx.column.count({ where: { projectId: project.id } });
            }

            // 3. Create columns from phases
            const columnMap = new Map<string, string>(); // phase name → column ID

            for (let i = 0; i < result.phases.length; i++) {
                const phaseName = result.phases[i];
                const colorSet = COLUMN_COLORS[i % COLUMN_COLORS.length];

                const column = await tx.column.create({
                    data: {
                        name: phaseName,
                        order: existingColumnCount + i,
                        projectId: project.id,
                        color: colorSet.color,
                        cardColor: colorSet.cardColor,
                    }
                });

                columnMap.set(phaseName, column.id);
            }

            // 4. Create tasks (first pass — without dependencies)
            const csvIdToDbId = new Map<string, string>(); // CSV id → DB id
            const taskOrderByColumn = new Map<string, number>(); // column id → next order

            // If importing to existing project, count existing tasks per column
            if (targetProjectId) {
                for (const columnId of columnMap.values()) {
                    const count = await tx.task.count({ where: { columnId } });
                    taskOrderByColumn.set(columnId, count);
                }
            }

            for (const row of result.rows) {
                const columnId = columnMap.get(row.fase);
                if (!columnId) continue;

                const currentOrder = taskOrderByColumn.get(columnId) || 0;
                taskOrderByColumn.set(columnId, currentOrder + 1);

                const task = await tx.task.create({
                    data: {
                        title: row.tarea,
                        description: row.descripcion || null,
                        columnId,
                        order: currentOrder,
                        startDate: row.inicio ? new Date(row.inicio + 'T00:00:00') : null,
                        endDate: row.fin ? new Date(row.fin + 'T00:00:00') : null,
                        toleranceDate: row.tolerancia ? new Date(row.tolerancia + 'T00:00:00') : null,
                        progress: mapEstadoToProgress(row.estado),
                        priority: mapPrioridadToPriority(row.prioridad || 'media'),
                        isHiddenInGantt: false,
                    }
                });

                csvIdToDbId.set(row.id, task.id);
            }

            // 5. Second pass — set parent-child relationships (padre → parentId)
            const parentWarnings: string[] = [];
            for (const row of result.rows) {
                if (!row.padre) continue;

                const taskDbId = csvIdToDbId.get(row.id);
                const parentDbId = csvIdToDbId.get(row.padre);

                if (!taskDbId || !parentDbId) {
                    parentWarnings.push(`Relación padre ignorada: tarea "${row.tarea}" → padre ID "${row.padre}" no encontrado`);
                    continue;
                }

                await tx.task.update({
                    where: { id: taskDbId },
                    data: { parentId: parentDbId }
                });
            }

            return {
                projectId: project.id,
                stats: {
                    columns: result.phases.length,
                    tasks: result.rows.length,
                    parents: result.stats.totalParents - parentWarnings.length,
                    warnings: [...result.warnings.map(w => w.message), ...parentWarnings],
                }
            };
        }, {
            timeout: 30000, // 30s for large imports
        });

        return NextResponse.json(importResult);

    } catch (error) {
        console.error("[SCENA_CSV_IMPORT]", error);
        return NextResponse.json(
            { error: "Error interno al importar el CSV" },
            { status: 500 }
        );
    }
}
