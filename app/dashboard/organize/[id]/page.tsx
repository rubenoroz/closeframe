"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, GripVertical } from "lucide-react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface FileItem {
    id: string;
    name: string;
    thumbnailLink?: string;
}

export default function OrganizePage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [cloudAccountId, setCloudAccountId] = useState<string | null>(null);
    const [folderId, setFolderId] = useState<string | null>(null);
    const [projectName, setProjectName] = useState("");

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        // Fetch project details first
        fetch(`/api/projects?id=${projectId}`) // Wait, api/projects returns ALL projects. I need a single fetch.
            // Actually api/projects lists all. I can filter or better: rely on the fact that I'm the owner.
            // But better is to just fetch the project. I'll fetch list and find.
            .then(res => res.json())
            .then(data => {
                const project = data.projects?.find((p: any) => p.id === projectId);
                if (project) {
                    setProjectName(project.name);
                    setCloudAccountId(project.cloudAccountId);
                    setFolderId(project.rootFolderId);

                    // Now fetch files
                    fetchValues(project.cloudAccountId, project.rootFolderId, projectId);
                } else {
                    alert("Proyecto no encontrado");
                    router.push("/dashboard");
                }
            })
            .catch(err => {
                console.error(err);
                router.push("/dashboard");
            });
    }, [projectId, router]);

    const fetchValues = (cId: string, fId: string, pId: string) => {
        fetch(`/api/cloud/files?cloudAccountId=${cId}&folderId=${fId}&projectId=${pId}`)
            .then(res => res.json())
            .then(data => {
                if (data.files) {
                    setFiles(data.files);
                }
                setLoading(false);
            });
    };

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event: any) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            setFiles((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }

        setActiveId(null);
    };

    const handleSave = async () => {
        setSaving(true);
        const fileOrder = files.map(f => f.id);

        try {
            const res = await fetch(`/api/projects/${projectId}/order`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileOrder }),
            });

            if (res.ok) {
                alert("Orden guardado correctamente");
            } else {
                const err = await res.json().catch(() => ({}));
                alert("Error al guardar: " + (err.error || "Error desconocido"));
            }
        } catch (e) {
            alert("Error de conexión");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-6">
            <header className="flex items-center justify-between max-w-6xl mx-auto mb-8 sticky top-0 bg-black/80 backdrop-blur z-20 py-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-full transition">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-medium">Organizar: {projectName}</h1>
                        <p className="text-xs text-neutral-500">Arrastra las imágenes para reordenar</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-full font-medium hover:bg-emerald-500 transition disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar Orden
                </button>
            </header>

            <div className="max-w-6xl mx-auto">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext items={files.map(f => f.id)} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {files.map((file) => (
                                <SortableItem key={file.id} file={file} cloudAccountId={cloudAccountId!} />
                            ))}
                        </div>
                    </SortableContext>

                    <DragOverlay>
                        {activeId ? (
                            <div className="w-full aspect-[4/3] bg-neutral-800 rounded-xl overflow-hidden shadow-2xl skew-y-2 scale-105 border-2 border-emerald-500 opacity-90 cursor-grabbing">
                                <img
                                    src={`/api/cloud/thumbnail?c=${cloudAccountId}&f=${activeId}&s=400`}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    );
}

function SortableItem({ file, cloudAccountId }: { file: FileItem; cloudAccountId: string }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: file.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="group relative aspect-[4/3] bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 hover:border-neutral-700 transition touch-none cursor-grab active:cursor-grabbing"
        >
            <img
                src={`/api/cloud/thumbnail?c=${cloudAccountId}&f=${file.id}&s=400`}
                alt={file.name}
                className="w-full h-full object-cover select-none pointer-events-none"
                loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                <GripVertical className="w-6 h-6 text-white drop-shadow-md" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition">
                <p className="text-[10px] text-neutral-300 truncate">{file.name}</p>
            </div>
        </div>
    );
}
