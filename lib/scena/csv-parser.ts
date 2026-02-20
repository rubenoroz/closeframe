// lib/scena/csv-parser.ts
// Robust CSV parser and validator for Scena project imports

export interface CsvTaskRow {
    id: string;
    fase: string;
    tarea: string;
    descripcion: string;
    responsable: string;
    inicio: string;
    fin: string;
    tolerancia: string;
    duracion: string;
    dependencia: string;
    padre: string;
    entregable: string;
    estado: string;
    prioridad: string;
}

export interface CsvValidationError {
    row: number;
    field: string;
    message: string;
}

export interface CsvWarning {
    row: number;
    message: string;
}

export interface CsvParseResult {
    rows: CsvTaskRow[];
    errors: CsvValidationError[];
    warnings: CsvWarning[];
    phases: string[];
    stats: {
        totalRows: number;
        validRows: number;
        totalPhases: number;
        totalDependencies: number;
        totalParents: number;
    };
}

const REQUIRED_FIELDS = ['id', 'fase', 'tarea', 'inicio', 'fin', 'estado'] as const;
const ALL_FIELDS = ['id', 'fase', 'tarea', 'descripcion', 'responsable', 'inicio', 'fin', 'tolerancia', 'duracion', 'dependencia', 'padre', 'entregable', 'estado', 'prioridad'] as const;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const VALID_STATES = ['pendiente', 'en progreso', 'en revisión', 'en revision', 'completado', 'completada', 'done', 'todo', 'in_progress', 'review'];
const VALID_PRIORITIES = ['alta', 'media', 'baja', 'high', 'medium', 'low', ''];

/**
 * Parse a CSV string into rows, handling quoted fields and edge cases
 */
function parseCsvString(csvContent: string): string[][] {
    const lines: string[][] = [];
    const text = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    let currentLine: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (inQuotes) {
            if (char === '"' && nextChar === '"') {
                currentField += '"';
                i++; // skip escaped quote
            } else if (char === '"') {
                inQuotes = false;
            } else {
                currentField += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                currentLine.push(currentField.trim());
                currentField = '';
            } else if (char === '\n') {
                currentLine.push(currentField.trim());
                if (currentLine.some(f => f !== '')) {
                    lines.push(currentLine);
                }
                currentLine = [];
                currentField = '';
            } else {
                currentField += char;
            }
        }
    }

    // Last line
    currentLine.push(currentField.trim());
    if (currentLine.some(f => f !== '')) {
        lines.push(currentLine);
    }

    return lines;
}

/**
 * Normalize header names: lowercase, trim, remove BOM
 */
function normalizeHeader(header: string): string {
    return header
        .replace(/^\uFEFF/, '') // Remove BOM
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents for matching
        ;
}

/**
 * Map normalized header to canonical field name
 */
function mapHeaderToField(normalized: string): string | null {
    const mapping: Record<string, string> = {
        'id': 'id',
        'fase': 'fase',
        'phase': 'fase',
        'columna': 'fase',
        'column': 'fase',
        'tarea': 'tarea',
        'task': 'tarea',
        'nombre': 'tarea',
        'name': 'tarea',
        'titulo': 'tarea',
        'title': 'tarea',
        'descripcion': 'descripcion',
        'description': 'descripcion',
        'detalle': 'descripcion',
        'responsable': 'responsable',
        'assignee': 'responsable',
        'asignado': 'responsable',
        'inicio': 'inicio',
        'start': 'inicio',
        'start_date': 'inicio',
        'fecha_inicio': 'inicio',
        'fin': 'fin',
        'end': 'fin',
        'end_date': 'fin',
        'fecha_fin': 'fin',
        'tolerancia': 'tolerancia',
        'tolerance': 'tolerancia',
        'fecha_tolerancia': 'tolerancia',
        'tolerance_date': 'tolerancia',
        'limite': 'tolerancia',
        'duracion': 'duracion',
        'duration': 'duracion',
        'dias': 'duracion',
        'dependencia': 'dependencia',
        'dependency': 'dependencia',
        'depends_on': 'dependencia',
        'padre': 'padre',
        'parent': 'padre',
        'parent_id': 'padre',
        'tarea_padre': 'padre',
        'subtarea_de': 'padre',
        'entregable': 'entregable',
        'deliverable': 'entregable',
        'estado': 'estado',
        'status': 'estado',
        'prioridad': 'prioridad',
        'priority': 'prioridad',
    };
    return mapping[normalized] || null;
}

/**
 * Validate a date string in YYYY-MM-DD format
 */
function isValidDate(dateStr: string): boolean {
    if (!DATE_REGEX.test(dateStr)) return false;
    const date = new Date(dateStr + 'T00:00:00');
    return !isNaN(date.getTime());
}

/**
 * Main parser function: parse CSV content and validate
 */
export function parseCsvForScena(csvContent: string): CsvParseResult {
    const errors: CsvValidationError[] = [];
    const warnings: CsvWarning[] = [];
    const rows: CsvTaskRow[] = [];
    const phasesSet = new Set<string>();
    const phaseOrder: string[] = [];

    if (!csvContent || csvContent.trim().length === 0) {
        errors.push({ row: 0, field: 'file', message: 'El archivo CSV está vacío' });
        return { rows, errors, warnings, phases: [], stats: { totalRows: 0, validRows: 0, totalPhases: 0, totalDependencies: 0, totalParents: 0 } };
    }

    const parsed = parseCsvString(csvContent);

    if (parsed.length < 2) {
        errors.push({ row: 0, field: 'file', message: 'El CSV debe tener al menos una fila de encabezados y una fila de datos' });
        return { rows, errors, warnings, phases: [], stats: { totalRows: 0, validRows: 0, totalPhases: 0, totalDependencies: 0, totalParents: 0 } };
    }

    // Parse headers
    const rawHeaders = parsed[0];
    const headerMap: Record<number, string> = {};
    const foundFields = new Set<string>();

    for (let i = 0; i < rawHeaders.length; i++) {
        const normalized = normalizeHeader(rawHeaders[i]);
        const field = mapHeaderToField(normalized);
        if (field) {
            headerMap[i] = field;
            foundFields.add(field);
        }
    }

    // Check required fields
    for (const required of REQUIRED_FIELDS) {
        if (!foundFields.has(required)) {
            errors.push({ row: 1, field: required, message: `Campo obligatorio "${required}" no encontrado en los encabezados` });
        }
    }

    if (errors.length > 0) {
        return { rows, errors, warnings, phases: [], stats: { totalRows: 0, validRows: 0, totalPhases: 0, totalDependencies: 0, totalParents: 0 } };
    }

    // Parse data rows
    const seenIds = new Set<string>();
    let dependencyCount = 0;
    let parentCount = 0;

    for (let rowIdx = 1; rowIdx < parsed.length; rowIdx++) {
        const rawRow = parsed[rowIdx];
        const rowNum = rowIdx + 1; // 1-indexed for user display

        // Build row object
        const row: Record<string, string> = {};
        for (const field of ALL_FIELDS) {
            row[field] = '';
        }

        for (let colIdx = 0; colIdx < rawRow.length; colIdx++) {
            const field = headerMap[colIdx];
            if (field) {
                row[field] = rawRow[colIdx] || '';
            }
        }

        const taskRow = row as unknown as CsvTaskRow;
        let rowHasErrors = false;

        // Validate required fields
        if (!taskRow.id) {
            errors.push({ row: rowNum, field: 'id', message: 'El campo "id" es obligatorio' });
            rowHasErrors = true;
        }
        if (!taskRow.fase) {
            errors.push({ row: rowNum, field: 'fase', message: 'El campo "fase" es obligatorio' });
            rowHasErrors = true;
        }
        if (!taskRow.tarea) {
            errors.push({ row: rowNum, field: 'tarea', message: 'El campo "tarea" es obligatorio' });
            rowHasErrors = true;
        }
        if (!taskRow.estado) {
            errors.push({ row: rowNum, field: 'estado', message: 'El campo "estado" es obligatorio' });
            rowHasErrors = true;
        }

        // Validate dates
        if (!taskRow.inicio) {
            errors.push({ row: rowNum, field: 'inicio', message: 'El campo "inicio" es obligatorio' });
            rowHasErrors = true;
        } else if (!isValidDate(taskRow.inicio)) {
            errors.push({ row: rowNum, field: 'inicio', message: `Formato de fecha inválido: "${taskRow.inicio}". Use YYYY-MM-DD` });
            rowHasErrors = true;
        }

        if (!taskRow.fin) {
            errors.push({ row: rowNum, field: 'fin', message: 'El campo "fin" es obligatorio' });
            rowHasErrors = true;
        } else if (!isValidDate(taskRow.fin)) {
            errors.push({ row: rowNum, field: 'fin', message: `Formato de fecha inválido: "${taskRow.fin}". Use YYYY-MM-DD` });
            rowHasErrors = true;
        }

        // Date range validation
        if (taskRow.inicio && taskRow.fin && isValidDate(taskRow.inicio) && isValidDate(taskRow.fin)) {
            if (new Date(taskRow.fin) < new Date(taskRow.inicio)) {
                warnings.push({ row: rowNum, message: `La fecha de fin (${taskRow.fin}) es anterior a la de inicio (${taskRow.inicio})` });
            }
        }

        // Validate duplicate IDs
        if (taskRow.id && seenIds.has(taskRow.id)) {
            errors.push({ row: rowNum, field: 'id', message: `ID duplicado: "${taskRow.id}"` });
            rowHasErrors = true;
        }
        if (taskRow.id) seenIds.add(taskRow.id);

        // Validate state
        if (taskRow.estado && !VALID_STATES.includes(taskRow.estado.toLowerCase())) {
            warnings.push({ row: rowNum, message: `Estado no reconocido: "${taskRow.estado}". Se usará "Pendiente"` });
        }

        // Validate priority
        if (taskRow.prioridad && !VALID_PRIORITIES.includes(taskRow.prioridad.toLowerCase())) {
            warnings.push({ row: rowNum, message: `Prioridad no reconocida: "${taskRow.prioridad}". Se usará "Media"` });
        }

        // Track phases in order
        if (taskRow.fase && !phasesSet.has(taskRow.fase)) {
            phasesSet.add(taskRow.fase);
            phaseOrder.push(taskRow.fase);
        }

        // Count dependencies and parents
        if (taskRow.dependencia) {
            dependencyCount++;
        }
        if (taskRow.padre) {
            parentCount++;
        }

        if (!rowHasErrors) {
            rows.push(taskRow);
        }
    }

    // Validate references exist (after parsing all rows)
    const allIds = new Set(rows.map(r => r.id));
    for (const row of rows) {
        if (row.dependencia && !allIds.has(row.dependencia)) {
            warnings.push({
                row: parseInt(row.id) + 1,
                message: `Dependencia "${row.dependencia}" no encontrada. Se ignorará.`
            });
        }
        if (row.padre && !allIds.has(row.padre)) {
            warnings.push({
                row: parseInt(row.id) + 1,
                message: `Tarea padre "${row.padre}" no encontrada. Se ignorará.`
            });
        }
    }

    return {
        rows,
        errors,
        warnings,
        phases: phaseOrder,
        stats: {
            totalRows: parsed.length - 1,
            validRows: rows.length,
            totalPhases: phaseOrder.length,
            totalDependencies: dependencyCount,
            totalParents: parentCount,
        },
    };
}

/**
 * Map CSV estado to Task progress (0-100)
 */
export function mapEstadoToProgress(estado: string): number {
    const normalized = estado.toLowerCase().trim();
    switch (normalized) {
        case 'pendiente':
        case 'todo':
            return 0;
        case 'en progreso':
        case 'in_progress':
            return 50;
        case 'en revisión':
        case 'en revision':
        case 'review':
            return 75;
        case 'completado':
        case 'completada':
        case 'done':
            return 100;
        default:
            return 0;
    }
}

/**
 * Map CSV prioridad to Task priority enum
 */
export function mapPrioridadToPriority(prioridad: string): string {
    const normalized = prioridad.toLowerCase().trim();
    switch (normalized) {
        case 'alta':
        case 'high':
            return 'HIGH';
        case 'media':
        case 'medium':
        case '':
            return 'MEDIUM';
        case 'baja':
        case 'low':
            return 'LOW';
        default:
            return 'MEDIUM';
    }
}

/**
 * Generate a sample CSV template
 */
/**
 * Generate a sample CSV template
 */
export function generateCsvTemplate(): string {
    const bom = '\uFEFF';
    const headers = ALL_FIELDS.join(',');
    const sampleRows = [
        '1,Preproducción,Investigación del tema,Análisis y documentación inicial,Director,2026-01-15,2026-01-20,2026-01-22,5,,,Dossier de investigación,Pendiente,Alta',
        '2,Preproducción,Guion técnico,Desarrollo del guion,Guionista,2026-01-21,2026-01-28,,7,1,,Guion aprobado,Pendiente,Alta',
        '3,Producción,Rodaje día 1,Grabación de escenas principales,Equipo completo,2026-02-01,2026-02-01,,1,2,,Material grabado,Pendiente,Media',
        '4,Producción,Setup de iluminación,Preparar luces para set 1,Iluminador,2026-02-01,2026-02-01,,1,,3,Material grabado,Pendiente,Baja',
        '5,Producción,Setup de audio,Preparar micrófonos,Sonidista,2026-02-01,2026-02-01,,1,,3,Material grabado,Pendiente,Baja',
        '6,Postproducción,Edición,Primer corte de edición,Editor,2026-02-05,2026-02-15,,10,3,,Primer corte,Pendiente,Alta',
    ];
    return bom + [headers, ...sampleRows].join('\n');
}

/**
 * Export tasks to CSV string (Import-compatible)
 */
export function exportTasksToCsv(tasks: any[], columns: any[]): string {
    const bom = '\uFEFF';
    const headers = ALL_FIELDS.join(',');

    // Helper to escape CSV fields
    const escape = (field: string | null | undefined): string => {
        if (!field) return '';
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
            return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
    };

    // Helper to format date
    const formatDate = (date: Date | string | null | undefined): string => {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().split('T')[0];
    };

    // Helper to map progress to text status
    const getStatus = (progress: number): string => {
        if (progress >= 100) return 'Completado';
        if (progress > 0) return 'En Progreso';
        return 'Pendiente';
    };

    // Helper to map priority
    const getPriority = (priority: string): string => {
        switch (priority?.toUpperCase()) {
            case 'HIGH': return 'Alta';
            case 'LOW': return 'Baja';
            default: return 'Media';
        }
    };

    // Sort tasks by Column Order then Task Order
    const sortedTasks = [...tasks].sort((a, b) => {
        // 1. Column Order
        const colA = columns.find(c => c.id === a.columnId);
        const colB = columns.find(c => c.id === b.columnId);
        const orderA = colA?.order ?? 9999;
        const orderB = colB?.order ?? 9999;

        if (orderA !== orderB) return orderA - orderB;

        // 2. Task Order
        return (a.order || 0) - (b.order || 0);
    });

    const rows = sortedTasks.map(task => {
        const column = columns.find(c => c.id === task.columnId);
        const phaseName = column ? column.name : 'Sin Fase';

        // Calculate duration if needed, or leave empty
        let duration = '';
        if (task.startDate && task.endDate) {
            const start = new Date(task.startDate);
            const end = new Date(task.endDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)).toString();
        }

        // Map to ALL_FIELDS order: 
        // ['id', 'fase', 'tarea', 'descripcion', 'responsable', 'inicio', 'fin', 'tolerancia', 'duracion', 'dependencia', 'padre', 'entregable', 'estado', 'prioridad']
        return [
            escape(task.id), // We use the real ID so updates might work if we supported them, or just strictly for reference. 
            // NOTE: Re-importing usually ignores ID or treats as new if not matching existing. 
            // For "Import compatible" to same platform, maybe we should use a sequential number?
            // The user said "importable de nuevo a la misma plataforma". 
            // If we use UUIDs, the generic import might be confused if it expects small integers for dependencies?
            // The parser uses `id` for dependencies. So as long as we use the SAME ids for dependencies, it works.
            // However, the UUIDs are long. Let's stick to real IDs for accuracy.
            escape(phaseName),
            escape(task.title),
            escape(task.description),
            '', // Responsable - not currently in FetchedTask?
            formatDate(task.startDate),
            formatDate(task.endDate),
            formatDate(task.toleranceDate),
            escape(duration),
            '', // Dependencia - we don't strictly track "predecessors" link field in basic FetchedTask unless we look at 'links'? 
            // The prompt says "dependencia" in CSV. In Scena currently we have parent/child.
            // We don't have a rigid "Predecessor" field in the `Task` model shown in the generic interface, 
            // but we might want to map something if it exists. 
            // For now, leave empty as it's not a standard field in the `FetchedTask` interface I've seen.
            escape(task.parentId),
            '', // Entregable
            escape(getStatus(task.progress || 0)),
            escape(getPriority(task.priority))
        ].join(',');
    });

    return bom + [headers, ...rows].join('\n');
}
