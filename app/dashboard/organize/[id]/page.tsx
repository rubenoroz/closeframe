"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, GripVertical, Folder as FolderIcon, LayoutGrid } from "lucide-react";
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
    horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface FileItem {
    id: string;
    name: string;
    thumbnailLink?: string;
    folderId?: string; // Track which folder this file belongs to
}

interface FolderItem {
    id: string;
    name: string;
}

export default function OrganizePage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [allFiles, setAllFiles] = useState<FileItem[]>([]); // Global source of truth
    const [folders, setFolders] = useState<FolderItem[]>([]);
    const [activeTabId, setActiveTabId] = useState<string>('root'); // 'root' or folderId

    // UI Loading state
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // DND Active State
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [isDraggingFolder, setIsDraggingFolder] = useState(false);

    const [cloudAccountId, setCloudAccountId] = useState<string | null>(null);
    const [rootFolderId, setRootFolderId] = useState<string | null>(null); // For referencing 'root'
    const [projectName, setProjectName] = useState("");

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Prevent accidental drags on clicks
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        const fetchAllContent = async () => {
            try {
                // 1. Fetch Project
                const pRes = await fetch(`/api/projects?id=${projectId}`);
                const pData = await pRes.json();
                const project = pData.projects?.find((p: any) => p.id === projectId);

                if (!project) { router.push("/dashboard"); return; }

                setProjectName(project.name);
                setCloudAccountId(project.cloudAccountId);
                setRootFolderId(project.rootFolderId);

                // 2. Fetch Folders
                const fRes = await fetch(`/api/cloud/folders?cloudAccountId=${project.cloudAccountId}&folderId=${project.rootFolderId}`);
                let validFolders: FolderItem[] = [];
                if (fRes.ok) {
                    const fData = await fRes.json();
                    if (fData.folders) {
                        validFolders = fData.folders.filter((f: any) =>
                            !['webjpg', 'jpg', 'raw', 'print', 'highres'].includes(f.name.toLowerCase())
                        );

                        // Apply Manual Folder Order
                        if ((project as any).momentsOrder && Array.isArray((project as any).momentsOrder)) {
                            const mOrder = new Map();
                            (project as any).momentsOrder.forEach((id: string, idx: number) => mOrder.set(id, idx));
                            validFolders.sort((a, b) => {
                                const idxA = mOrder.has(a.id) ? mOrder.get(a.id) : 999999;
                                const idxB = mOrder.has(b.id) ? mOrder.get(b.id) : 999999;
                                return idxA - idxB;
                            });
                        } else {
                            validFolders.sort((a, b) => a.name.localeCompare(b.name));
                        }
                    }
                }
                setFolders(validFolders);

                // 3. Fetch Files (Tagged by folderId)
                // Root files
                const rootFiles = await fetch(`/api/cloud/files?cloudAccountId=${project.cloudAccountId}&folderId=${project.rootFolderId}&projectId=${projectId}`)
                    .then(r => r.json())
                    .then(d => (d.files || []).map((f: any) => ({ ...f, folderId: 'root' })));

                // Subfolder files
                const subFilesPromises = validFolders.map(folder =>
                    fetch(`/api/cloud/files?cloudAccountId=${project.cloudAccountId}&folderId=${folder.id}&projectId=${projectId}`)
                        .then(r => r.ok ? r.json() : { files: [] })
                        .then(d => (d.files || []).map((f: any) => ({ ...f, folderId: folder.id })))
                );
                const subFilesLists = await Promise.all(subFilesPromises);

                // Merge
                let merged = [...rootFiles, ...subFilesLists.flat()];
                // Filter junk
                merged = merged.filter(f =>
                    !f.name.toLowerCase().endsWith('.zip') &&
                    !['webjpg', 'jpg', 'raw', 'print', 'highres'].includes(f.name.toLowerCase())
                );
                // Deduplicate by ID (just in case)
                const uniqueMap = new Map();
                merged.forEach(f => uniqueMap.set(f.id, f));
                merged = Array.from(uniqueMap.values());

                // Apply Manual File Order (Global)
                if (project.fileOrder && Array.isArray(project.fileOrder)) {
                    const fOrder = new Map();
                    project.fileOrder.forEach((id: string, idx: number) => fOrder.set(id, idx));
                    merged.sort((a, b) => {
                        const idxA = fOrder.has(a.id) ? fOrder.get(a.id) : 999999;
                        const idxB = fOrder.has(b.id) ? fOrder.get(b.id) : 999999;
                        return idxA - idxB;
                    });
                } else {
                    merged.sort((a, b) => a.name.localeCompare(b.name));
                }

                setAllFiles(merged);
                setLoading(false);

            } catch (e) {
                console.error(e);
                setLoading(false);
            }
        };
        fetchAllContent();
    }, [projectId, router]);


    // ------ DRAG HANDLERS for FILES ------
    const handleDragStart = (event: any) => {
        const { active } = event;
        setActiveDragId(active.id);
        // Detect if dragging a folder or a file? 
        // We use SortableContext IDs. But if IDs collide, issue. 
        // Folder IDs are from Drive, File IDs are from Drive. They are unique strings usually.
        // We can check if active.id is in folders list.
        if (folders.find(f => f.id === active.id)) {
            setIsDraggingFolder(true);
        } else {
            setIsDraggingFolder(false);
        }
    };

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        setActiveDragId(null);
        setIsDraggingFolder(false);

        if (!over || active.id === over.id) return;

        // Is it a folder reorder?
        if (folders.find(f => f.id === active.id)) {
            setFolders((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
            return;
        }

        // It is a file reorder within the current view
        // We need to reorder 'allFiles' but respecting the LOCAL order change.
        // 1. Get filtered list of current view
        const currentViewFiles = allFiles.filter(f => activeTabId === 'root' ? f.folderId === 'root' : f.folderId === activeTabId);
        // 2. Perform the move on this subset
        const oldIndex = currentViewFiles.findIndex(f => f.id === active.id);
        const newIndex = currentViewFiles.findIndex(f => f.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            const newSubset = arrayMove(currentViewFiles, oldIndex, newIndex);

            // 3. Reconstruct 'allFiles' by replacing the subset
            // This preserves the order of OTHER folders' files relative to the whole list?
            // Actually, we just need to keep "Global List" = "Folder A files" + "Folder B files" ? 
            // Or "Global List" = mixed? 
            // CloserGallery filters then sorts. So if we group them in the global list by folder, it's safer.
            // But if we just update the global list to match the new visual order of this subset...

            // Strategy: Remove subset from global, then re-insert subset in new order?
            // BUT, users might expect global order to be maintained across folders if they view "All"? 
            // CloserLens view is folder-based. So order within folder is what matters.

            setAllFiles(prev => {
                const otherFiles = prev.filter(f => (activeTabId === 'root' ? f.folderId !== 'root' : f.folderId !== activeTabId));
                // We append the new subset. PRESERVING folder grouping is usually good for simple logic.
                // Or we can try to inject them back where they were? Too complex.
                // Just concatenating (Others + NewSubset) works IF the display logic filters by folder anyway.
                // Wait, if I drag file A to pos 0 in Folder A, its index in Global should be "before other Folder A files".

                // Let's rely on the fact that files are consumed PER FOLDER in the Viewer.
                // So the Global Order relative position of "File A (Folder B)" vs "File C (Folder D)" doesn't matter.
                // What matters is "File A (Folder A)" vs "File B (Folder A)".

                return [...otherFiles, ...newSubset];
            });
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const body = {
                fileOrder: allFiles.map(f => f.id),
                momentsOrder: folders.map(f => f.id)
            };

            const res = await fetch(`/api/projects/${projectId}/order`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                router.push("/dashboard");
            } else {
                alert("Error al guardar");
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

    // View Filters
    const displayedFiles = allFiles.filter(f => activeTabId === 'root' ? f.folderId === 'root' : f.folderId === activeTabId);

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            {/* --- HEADER --- */}
            <header className="sticky top-0 z-50 bg-neutral-900/80 backdrop-blur border-b border-neutral-800">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Link href="/dashboard" className="p-2 hover:bg-neutral-800 rounded-full transition text-neutral-400 hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div>
                                <h1 className="text-lg font-medium leading-none mb-1">{projectName}</h1>
                                <p className="text-xs text-neutral-500">Organizador</p>
                            </div>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-sm font-medium transition disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Guardar Cambios
                        </button>
                    </div>

                    {/* --- TABS (Sortable Folders) --- */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {/* Root Tab (Fixed) */}
                        <button
                            onClick={() => setActiveTabId('root')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTabId === 'root' ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-400 hover:text-white'
                                }`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            Principal
                        </button>

                        <div className="w-px h-6 bg-neutral-800 mx-1 shrink-0" />

                        {/* Sortable Folder Tabs */}
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext items={folders.map(f => f.id)} strategy={horizontalListSortingStrategy}>
                                <div className="flex items-center gap-2">
                                    {folders.map(folder => (
                                        <SortableTab
                                            key={folder.id}
                                            folder={folder}
                                            isActive={activeTabId === folder.id}
                                            onClick={() => setActiveTabId(folder.id)}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>
                </div>
            </header>

            {/* --- MAIN CONTENT (Grid) --- */}
            <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext items={displayedFiles.map(f => f.id)} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {displayedFiles.map(file => (
                                <SortableFile key={file.id} file={file} cloudAccountId={cloudAccountId!} />
                            ))}
                        </div>
                    </SortableContext>

                    {displayedFiles.length === 0 && (
                        <div className="col-span-full py-20 text-center text-neutral-500">
                            <p>Esta carpeta está vacía.</p>
                        </div>
                    )}

                    <DragOverlay>
                        {activeDragId ? (
                            isDraggingFolder ? (
                                <div className="px-3 py-1.5 bg-neutral-700 text-white rounded-lg text-sm font-medium shadow-xl opacity-90 cursor-grabbing border border-emerald-500/50">
                                    {folders.find(f => f.id === activeDragId)?.name}
                                </div>
                            ) : (
                                <div className="w-full aspect-[4/3] bg-neutral-800 rounded-xl overflow-hidden shadow-2xl skew-y-2 scale-105 border-2 border-emerald-500 opacity-90 cursor-grabbing">
                                    <img
                                        src={`/api/cloud/thumbnail?c=${cloudAccountId}&f=${activeDragId}&s=400`}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </main>
        </div>
    );
}


// --- COMPONENTS ---

function SortableTab({ folder, isActive, onClick }: { folder: FolderItem, isActive: boolean, onClick: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: folder.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 10 : 1,
    };

    return (
        <button
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onClick}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap border ${isActive
                    ? 'bg-neutral-800 border-neutral-700 text-white shadow-sm'
                    : 'bg-neutral-900 border-transparent text-neutral-400 hover:text-white hover:bg-neutral-800'
                } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        >
            <GripVertical className="w-3 h-3 text-neutral-600" />
            <FolderIcon className="w-3.5 h-3.5" />
            {folder.name}
        </button>
    );
}

function SortableFile({ file, cloudAccountId }: { file: FileItem, cloudAccountId: string }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: file.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 2 : 1,
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
            {/* Select/Grab Indicator Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />

            <div className="absolute bottom-2 left-2 right-2 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-black/50 backdrop-blur-sm p-1 rounded-md">
                    <GripVertical className="w-4 h-4 text-white/80" />
                </div>
            </div>
        </div>
    );
}
