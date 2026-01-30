"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, GripVertical, Folder as FolderIcon, LayoutGrid, Video, Trash2, Plus } from "lucide-react";
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
import VideoPicker from "@/components/VideoPicker";

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

interface VideoItem {
    id: string;
    title: string;
    thumbnail: string;
    provider: 'youtube' | 'vimeo';
    providerId?: string;
    externalId?: string;
    duration?: number;
    momentName?: string;
}

export default function OrganizePage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [allFiles, setAllFiles] = useState<FileItem[]>([]); // Global source of truth
    const [folders, setFolders] = useState<FolderItem[]>([]);
    const [projectVideos, setProjectVideos] = useState<VideoItem[]>([]);

    const [activeTabId, setActiveTabId] = useState<string>('root'); // 'root' | folderId | 'videos'
    const [enableVideoTab, setEnableVideoTab] = useState(false);
    const [fileOrder, setFileOrder] = useState<string[]>([]);

    // UI Loading state
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showVideoPicker, setShowVideoPicker] = useState(false);

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
                const pRes = await fetch(`/api/projects/${projectId}`, { cache: 'no-store' });
                const pData = await pRes.json();
                const project = pData.project;

                console.log("OrganizePage: loaded project", project); // Debug log

                if (!project) { router.push("/dashboard"); return; }

                setProjectName(project.name);
                setCloudAccountId(project.cloudAccountId);
                setRootFolderId(project.rootFolderId);
                setEnableVideoTab(!!project.enableVideoTab);

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
                    !f.name.startsWith('.') && // Filter dotfiles like .DS_Store
                    !['webjpg', 'jpg', 'raw', 'print', 'highres', 'icon'].includes(f.name.toLowerCase())
                );
                // Deduplicate by ID
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
                setFileOrder(project.fileOrder || []);

                // 4. Fetch Videos
                try {
                    const vRes = await fetch(`/api/projects/${projectId}/videos`);
                    if (vRes.ok) {
                        const vData = await vRes.json();
                        setProjectVideos(vData.videos || []);
                    }
                } catch (e) {
                    console.error("Failed to fetch videos", e);
                }

                // 5. Intelligent Tab Selection (Hide Principal if empty)
                const rootHasFiles = merged.some(f => f.folderId === 'root');
                if (!rootHasFiles && validFolders.length > 0) {
                    setActiveTabId(validFolders[0].id);
                }

                setLoading(false);

            } catch (e) {
                console.error(e);
                setLoading(false);
            }
        };
        fetchAllContent();
    }, [projectId, router]);


    // ------ DRAG HANDLERS ------
    const handleDragStart = (event: any) => {
        const { active } = event;
        setActiveDragId(active.id);

        // Detect dragging type
        if (activeTabId === 'videos') {
            // Dragging video
            return;
        }

        // Folder or File
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

        // 1. VIDEOS REORDER
        if (activeTabId === 'videos') {
            setProjectVideos((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
            return;
        }

        // 2. FOLDER REORDER
        if (folders.find(f => f.id === active.id)) {
            setFolders((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
            return;
        }

        // 3. HYBRID REORDER (Files + Videos in current moment)
        const oldIndex = displayedItems.findIndex(i => i.id === active.id);
        const newIndex = displayedItems.findIndex(i => i.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            const movedItems = arrayMove(displayedItems, oldIndex, newIndex);
            const movedIds = movedItems.map(i => i.id);

            setFileOrder(prev => {
                const currentViewIds = new Set(displayedItems.map(i => i.id));
                const remaining = prev.filter(id => !currentViewIds.has(id));

                // We need to insert the movedIds at the position where the first item of this view was
                // To keep it simple for now, we'll just append them at the end or maintain a global order
                // The most reliable way is to rebuild the order from all source states
                const allCurrentIds = [
                    ...allFiles.map(f => f.id),
                    ...projectVideos.map(v => v.id)
                ];

                // Map of new positions within this view
                const newPosMap = new Map();
                movedIds.forEach((id, idx) => newPosMap.set(id, idx));

                // Return a combined order that respects the move
                return [...allCurrentIds].sort((a, b) => {
                    const hasA = newPosMap.has(a);
                    const hasB = newPosMap.has(b);

                    if (hasA && hasB) return newPosMap.get(a) - newPosMap.get(b);
                    if (hasA) return -1; // New items take precedence or stay where they are?
                    if (hasB) return 1;

                    // Preserve existing relative order for other items
                    const idxA = prev.indexOf(a);
                    const idxB = prev.indexOf(b);
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                    if (idxA !== -1) return -1;
                    if (idxB !== -1) return 1;
                    return 0;
                });
            });
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Save Files & Folders Order
            const orderRes = await fetch(`/api/projects/${projectId}/order`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fileOrder: fileOrder, // Now includes ALL IDs (files and videos)
                    momentsOrder: folders.map(f => f.id)
                }),
            });

            // Save Videos Order (if changes made)
            if (activeTabId === 'videos' || projectVideos.length > 0) {
                await fetch(`/api/projects/${projectId}/videos`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ videos: projectVideos.map(v => v.id) }),
                });
            }

            if (orderRes.ok) {
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

    const handleAddVideo = async (video: VideoItem & { provider: 'youtube' | 'vimeo' }) => {
        try {
            const activeMomento = folders.find(f => f.id === activeTabId);
            const targetMomentName = activeTabId === 'videos' ? "Videos" : (activeMomento?.name || "Principal");

            const payload = {
                provider: video.provider,
                externalId: video.id,
                title: video.title,
                thumbnail: video.thumbnail,
                duration: video.duration,
                momentName: targetMomentName
            };

            const res = await fetch(`/api/projects/${projectId}/videos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const newVideo = await res.json();
                setProjectVideos((prev: VideoItem[]) => [...prev, newVideo]);
            } else {
                console.error("Failed to add video");
                alert("Error al agregar video");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteVideo = async (videoId: string) => {
        if (!confirm("¿Eliminar video?")) return;
        try {
            setProjectVideos((prev: VideoItem[]) => prev.filter(v => v.id !== videoId));
            await fetch(`/api/projects/${projectId}/videos?id=${videoId}`, { method: "DELETE" });
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    // View Filters
    const currentFiles = allFiles.filter(f => activeTabId === 'root' ? f.folderId === 'root' : f.folderId === activeTabId);
    const activeMomento = folders.find(f => f.id === activeTabId);
    const currentMomentName = activeTabId === 'root' ? "Principal" : (activeMomento?.name || "");
    const currentVideos = activeTabId === 'videos' ? [] : projectVideos.filter(v => v.momentName === currentMomentName);

    const displayedItems = [...currentFiles, ...currentVideos].sort((a, b) => {
        const idxA = fileOrder.indexOf(a.id);
        const idxB = fileOrder.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;

        const nameA = 'title' in a ? (a as any).title : a.name;
        const nameB = 'title' in b ? (b as any).title : (b as any).name;
        return (nameA || "").localeCompare(nameB || "");
    });

    // Determine if we show 'Principal' tab
    const showPrincipalTab = allFiles.some(f => f.folderId === 'root') || folders.length === 0;

    return (
        <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
            {showVideoPicker && (
                <VideoPicker
                    onClose={() => setShowVideoPicker(false)}
                    onSelect={handleAddVideo}
                />
            )}

            {/* --- HEADER --- */}
            <header className="sticky top-0 z-50 bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-800/50 supports-[backdrop-filter]:bg-neutral-900/60">
                <div className="max-w-[1600px] mx-auto px-6 py-4">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard" className="p-2.5 hover:bg-white/5 rounded-full transition text-neutral-400 hover:text-white border border-transparent hover:border-white/10">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div>
                                <h1 className="text-xl font-light tracking-tight mb-1">{projectName}</h1>
                                <p className="text-xs text-neutral-500 font-medium uppercase tracking-widest">
                                    Organización de Contenido
                                    <span className="ml-2 px-2 py-0.5 bg-neutral-800 text-neutral-400 rounded text-[10px]">
                                        Video Mode: {enableVideoTab ? "ON" : "OFF"}
                                    </span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowVideoPicker(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full text-sm font-medium transition border border-white/5"
                                title="Agregar video de YouTube o Vimeo"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">Agregar YouTube/Vimeo</span>
                                <span className="sm:hidden">Video</span>
                            </button>

                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-2.5 bg-white text-black hover:bg-neutral-200 rounded-full text-sm font-medium transition disabled:opacity-50 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Guardar Cambios
                            </button>
                        </div>
                    </div>

                    {/* --- TABS (Sortable Folders) --- */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide mask-linear-fade">
                        {/* Root Tab (Conditional) */}
                        {showPrincipalTab && (
                            <button
                                onClick={() => setActiveTabId('root')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition whitespace-nowrap uppercase tracking-wider ${activeTabId === 'root' ? 'bg-white text-black' : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                                    }`}
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                Principal
                            </button>
                        )}

                        {showPrincipalTab && <div className="w-px h-6 bg-neutral-800 mx-2 shrink-0" />}

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

                        {enableVideoTab && (
                            <>
                                <div className="w-px h-6 bg-neutral-800 mx-2 shrink-0" />
                                <button
                                    onClick={() => setActiveTabId('videos')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition whitespace-nowrap uppercase tracking-wider ${activeTabId === 'videos' ? 'bg-white text-black' : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                                        }`}
                                >
                                    <Video className="w-3.5 h-3.5" />
                                    Videos
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* --- MAIN CONTENT (Grid) --- */}
            <main className="flex-1 p-6 md:p-10 max-w-[1600px] mx-auto w-full">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    {activeTabId === 'videos' ? (
                        /* VIDEO GRID */
                        <SortableContext items={projectVideos.map(v => v.id)} strategy={rectSortingStrategy}>
                            {projectVideos.length === 0 ? (
                                <div className="col-span-full py-32 text-center">
                                    <div className="w-20 h-20 bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-neutral-800">
                                        <Video className="w-8 h-8 text-neutral-700" />
                                    </div>
                                    <h3 className="text-lg font-medium text-neutral-300 mb-2">No tienes videos</h3>
                                    <p className="text-neutral-500 text-sm max-w-sm mx-auto mb-6">Agrega videos de YouTube o Vimeo a tu galería.</p>
                                    <button
                                        onClick={() => setShowVideoPicker(true)}
                                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition"
                                    >
                                        Agregar Video
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                                    {projectVideos.map(video => (
                                        <SortableVideo
                                            key={video.id}
                                            video={video}
                                            onDelete={() => handleDeleteVideo(video.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </SortableContext>
                    ) : (
                        /* FILE GRID (Hybrid) */
                        <SortableContext items={displayedItems.map(item => item.id)} strategy={rectSortingStrategy}>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
                                {displayedItems.map(item => (
                                    'title' in item ? (
                                        <SortableVideo key={item.id} video={item as any} onDelete={() => handleDeleteVideo(item.id)} />
                                    ) : (
                                        <SortableFile key={item.id} file={item as any} cloudAccountId={cloudAccountId!} />
                                    )
                                ))}
                            </div>

                            {displayedItems.length === 0 && (
                                <div className="col-span-full py-32 text-center">
                                    <div className="w-20 h-20 bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-neutral-800">
                                        <LayoutGrid className="w-8 h-8 text-neutral-700" />
                                    </div>
                                    <h3 className="text-lg font-medium text-neutral-300 mb-2">Momento Vacío</h3>
                                    <p className="text-neutral-500 text-sm max-w-sm mx-auto">Este momento no contiene imágenes ni videos externos.</p>
                                </div>
                            )}
                        </SortableContext>
                    )}

                    <DragOverlay>
                        {activeDragId ? (
                            isDraggingFolder ? (
                                <div className="px-4 py-2 bg-neutral-800 text-white rounded-full text-xs font-medium shadow-2xl opacity-90 cursor-grabbing border border-emerald-500/50 tracking-wider uppercase">
                                    {folders.find(f => f.id === activeDragId)?.name}
                                </div>
                            ) : activeTabId === 'videos' ? (
                                // Video Drag Overlay (simplified)
                                <div className="w-full aspect-video bg-neutral-800 rounded-lg shadow-2xl border border-emerald-500"></div>
                            ) : (
                                // File Drag Overlay
                                <div className="w-full aspect-[2/3] bg-neutral-800 rounded-lg overflow-hidden shadow-2xl skew-y-2 scale-105 border-2 border-emerald-500 opacity-90 cursor-grabbing">
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
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition whitespace-nowrap border uppercase tracking-wider ${isActive
                ? 'bg-white border-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        >
            <GripVertical className={`w-3 h-3 ${isActive ? 'text-neutral-400' : 'text-neutral-600'}`} />
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
            className="group relative aspect-[3/2] bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800/50 hover:border-neutral-600 transition-all duration-300 touch-none cursor-grab active:cursor-grabbing shadow-sm hover:shadow-xl hover:shadow-black/50"
        >
            <img
                src={`/api/cloud/thumbnail?c=${cloudAccountId}&f=${file.id}&s=400`}
                alt={file.name}
                className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
            />

            {/* Overlay Gradient */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Select/Grab Indicator Overlay */}
            <div className="absolute top-2 right-2 flex justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-[-10px] group-hover:translate-y-0">
                <div className="bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/10 text-white/90">
                    <GripVertical className="w-3.5 h-3.5" />
                </div>
            </div>

            <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-[10px] group-hover:translate-y-0">
                <p className="text-[10px] font-medium text-white/80 line-clamp-1 max-w-[90%]">{file.name}</p>
            </div>
        </div>
    );
}

function SortableVideo({ video, onDelete }: { video: VideoItem, onDelete: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: video.id });

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
            className="group relative aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800/50 hover:border-neutral-600 transition-all duration-300 touch-none cursor-grab active:cursor-grabbing shadow-sm hover:shadow-xl hover:shadow-black/50"
        >
            <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-500 group-hover:scale-105"
            />

            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

            <div className="absolute top-2 right-2 flex justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-[-10px] group-hover:translate-y-0 z-20">
                <div className="bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/10 text-white/90">
                    <GripVertical className="w-3.5 h-3.5" />
                </div>
            </div>

            <div className="absolute top-2 left-2 z-20">
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white flex items-center gap-1 ${video.provider === 'youtube' ? 'bg-red-600' : 'bg-sky-500'}`}>
                    {video.provider === 'youtube' ? <div className="w-2 h-2 rounded-full bg-white" /> : null}
                    {video.provider}
                </div>
            </div>

            <button
                onPointerDown={(e) => e.stopPropagation()} // Prevent drag start
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="absolute bottom-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-30"
            >
                <Trash2 className="w-3.5 h-3.5" />
            </button>

            <div className="absolute bottom-3 left-3 right-8 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <p className="text-[10px] font-medium text-white/90 line-clamp-1 drop-shadow-md">{video.title}</p>
            </div>
        </div>
    );
}

