"use client";

import React, { useState, useEffect } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragEndEvent,
    useDroppable,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
    arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PLANS, getPlanConfig } from "@/lib/plans.config";
import { Check, Lock, Shield, Star, Crown, LayoutGrid, List, Calendar, Image as ImageIcon, MousePointerClick, Download, Sparkles, Music, Video, Youtube, Users } from "lucide-react";
import { cn } from "@/lib/utils";

// Define all possible features with metadata
const ALL_FEATURES = [
    // Profile & Social
    { id: "advancedSocialNetworks", label: "Redes Sociales Avanzadas", icon: Star, description: "LinkedIn, YouTube, Website custom" },
    { id: "callToAction", label: "Call To Action", icon: MousePointerClick, description: "Botón principal en perfil" },
    { id: "hideBranding", label: "Ocultar Marca", icon: Crown, description: "Remueve 'Powered by Closerlens'" },

    // Gallery & Organization
    { id: "manualOrdering", label: "Orden Manual", icon: List, description: "Reordenar fotos en galerías" },
    { id: "listView", label: "Vista de Lista", icon: LayoutGrid, description: "Ver reservas en lista" },
    { id: "zipDownloadsEnabled", label: "Descargas ZIP", icon: Download, description: "Permitir descargas en ZIP" },

    // Booking
    { id: "bookingConfig", label: "Config. Reservas", icon: Calendar, description: "Ventana y anticipación personalizada" },

    // Closer Gallery (Premium)
    { id: "closerGallery", label: "Closer Gallery", icon: Sparkles, description: "Galerías premium con efectos" },
    { id: "musicGallery", label: "Música en Galerías", icon: Music, description: "Añadir música de fondo" },
    { id: "videoGallery", label: "Video en Galerías", icon: Video, description: "Soporte para video en galerías" },
    { id: "externalVideoAuth", label: "Videos Externos", icon: Youtube, description: "YouTube/Vimeo integrado" },
    { id: "collaborativeGalleries", label: "Galerías Colaborativas", icon: Users, description: "Subidas por QR desde invitados" },
];

interface FeatureDragManagerProps {
    userPlanId: string | null;
    currentOverrides: any;
    onChange: (newOverrides: any) => void;
}

// Droppable Container Component
function DroppableContainer({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
        <div
            ref={setNodeRef}
            className={cn(className, isOver && "bg-violet-500/5 border-violet-500/50")}
        >
            {children}
        </div>
    );
}

// Draggable Item Component
function SortableItem({ id, feature, type }: { id: string; feature: any; type: 'available' | 'active' }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                "p-3 rounded-xl border flex items-center gap-3 cursor-grab active:cursor-grabbing hover:border-violet-500/50 transition-colors select-none",
                type === 'active'
                    ? "bg-violet-500/10 border-violet-500/30 text-violet-100"
                    : "bg-neutral-800/50 border-neutral-700 text-neutral-400",
                isDragging && "opacity-50 ring-2 ring-violet-500 box-shadow-xl z-50"
            )}
        >
            <div className={cn(
                "p-2 rounded-lg",
                type === 'active' ? "bg-violet-500/20 text-violet-400" : "bg-neutral-800 text-neutral-500"
            )}>
                {feature.icon && <feature.icon className="w-4 h-4" />}
            </div>
            <div>
                <p className="text-xs font-bold">{feature.label}</p>
                <p className="text-[10px] opacity-70 truncate max-w-[150px]">{feature.description}</p>
            </div>
        </div>
    );
}

export default function FeatureDragManager({ userPlanId, currentOverrides, onChange }: FeatureDragManagerProps) {
    // 1. Determine Base Plan Features (Locked)
    const basePlanStats = getPlanConfig(userPlanId); // This returns the config, we need to map to our IDs

    // We need to know which features are enabled in the base plan
    const baseEnabledFeatures = Object.entries(basePlanStats.features)
        .filter(([_, enabled]) => enabled === true)
        .map(([key]) => key);

    // 2. Initialize State
    // "activeItems" are those currently enabled via Overrides
    const [activeItems, setActiveItems] = useState<string[]>(() => {
        if (!currentOverrides?.features) return [];
        return Object.keys(currentOverrides.features).filter(k => currentOverrides.features[k] === true);
    });

    // "availableItems" are those NOT enabled in base plan AND not in overrides
    const [availableItems, setAvailableItems] = useState<string[]>(() => {
        const overridden = Object.keys(currentOverrides?.features || {}).filter(k => currentOverrides.features[k] === true);
        return ALL_FEATURES
            .map(f => f.id)
            .filter(id => !baseEnabledFeatures.includes(id) && !overridden.includes(id));
    });

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const [activeId, setActiveId] = useState<string | null>(null);

    // Sync with parent when state changes
    useEffect(() => {
        const newOverrides = {
            ...currentOverrides,
            features: {
                ...currentOverrides?.features,
            }
        };

        // Reconstruct features object based on activeItems
        // We only explicitly set true for items in activeItems list
        // We remove keys that are moved back to available

        // Reset all boolean features in overrides to undefined (delete them) first?
        // No, keep limits. Just update features.

        ALL_FEATURES.forEach(f => {
            if (activeItems.includes(f.id)) {
                newOverrides.features[f.id] = true;
            } else if (availableItems.includes(f.id)) {
                // If it's in available, it means it is NOT overridden to true.
                // We should delete explicitly if it existed or set to undefined
                if (newOverrides.features[f.id]) delete newOverrides.features[f.id];
            }
        });

        onChange(newOverrides);
    }, [activeItems, availableItems]);


    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) {
            setActiveId(null);
            return;
        }

        const activeContainer = activeItems.includes(active.id as string) ? 'active' : 'available';
        const overContainer = activeItems.includes(over.id as string) || over.id === 'active-container' ? 'active' : 'available';

        if (activeContainer !== overContainer) {
            if (overContainer === 'active') {
                // Moving to Active
                setAvailableItems((items) => items.filter((item) => item !== active.id));
                setActiveItems((items) => [...items, active.id as string]);
            } else {
                // Moving to Available
                setActiveItems((items) => items.filter((item) => item !== active.id));
                setAvailableItems((items) => [...items, active.id as string]);
            }
        }

        setActiveId(null);
    };

    const activeFeature = ALL_FEATURES.find(f => f.id === activeId);

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-bold text-neutral-300 flex items-center gap-2">
                <Crown className="w-4 h-4 text-violet-500" />
                Desbloqueo Manual de Características
            </h3>
            <p className="text-xs text-neutral-500 px-1">
                Arrastra características a la derecha para desbloquearlas en este usuario, independientemente de su plan.
            </p>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="grid grid-cols-2 gap-4 h-[300px]">
                    {/* AVAILABLE (Source) */}
                    <DroppableContainer
                        id="available-container"
                        className="flex flex-col gap-2 p-3 bg-neutral-900/50 rounded-xl border border-neutral-800 overflow-y-auto"
                    >
                        <div className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 mb-2 flex justify-between">
                            <span>Disponibles</span>
                            <span className="bg-neutral-800 text-neutral-400 px-1.5 rounded">{availableItems.length}</span>
                        </div>

                        <SortableContext items={availableItems} strategy={verticalListSortingStrategy}>
                            {availableItems.map((id) => {
                                const feature = ALL_FEATURES.find(f => f.id === id);
                                if (!feature) return null;
                                return <SortableItem key={id} id={id} feature={feature} type="available" />;
                            })}
                            {availableItems.length === 0 && (
                                <div className="h-full min-h-[50px] flex items-center justify-center text-neutral-600 text-xs italic">
                                    No hay más características
                                </div>
                            )}
                        </SortableContext>

                        {/* Always visible base plan items (Disabled) */}
                        {baseEnabledFeatures.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-neutral-800 space-y-2 opacity-50">
                                <p className="text-[10px] text-neutral-500">Incluidas en {basePlanStats.name}</p>
                                {baseEnabledFeatures.map(id => {
                                    const feature = ALL_FEATURES.find(f => f.id === id);
                                    if (!feature) return null;
                                    return (
                                        <div key={id} className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                                <Check className="w-3 h-3" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-emerald-400">{feature.label}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </DroppableContainer>

                    {/* ACTIVE (Target) */}
                    <DroppableContainer
                        id="active-container"
                        className={cn(
                            "flex flex-col gap-2 p-3 bg-neutral-900/50 rounded-xl border border-dashed border-neutral-700 overflow-y-auto transition-colors",
                            "hover:bg-neutral-800/10 hover:border-violet-500/30"
                        )}
                    >
                        <div className="text-[10px] uppercase tracking-widest font-bold text-violet-400 mb-2 flex justify-between">
                            <span>Desbloqueadas (Override)</span>
                            <span className="bg-violet-500/20 text-violet-400 px-1.5 rounded">{activeItems.length}</span>
                        </div>

                        <SortableContext items={activeItems} strategy={verticalListSortingStrategy}>
                            {activeItems.map((id) => {
                                const feature = ALL_FEATURES.find(f => f.id === id);
                                if (!feature) return null;
                                return <SortableItem key={id} id={id} feature={feature} type="active" />;
                            })}
                            {activeItems.length === 0 && (
                                <div className="h-full min-h-[100px] flex flex-col items-center justify-center text-neutral-600 space-y-2">
                                    <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center border border-dashed border-neutral-700">
                                        <Crown className="w-4 h-4 opacity-20" />
                                    </div>
                                    <span className="text-xs italic">Arrastra aquí para activar</span>
                                </div>
                            )}
                        </SortableContext>
                    </DroppableContainer>
                </div>

                <DragOverlay>
                    {activeId && activeFeature ? (
                        <div className="p-3 rounded-xl border border-violet-500 bg-neutral-900 shadow-2xl flex items-center gap-3 w-full max-w-[200px] cursor-grabbing">
                            <div className="p-2 rounded-lg bg-violet-500 text-white shadow-lg">
                                {activeFeature.icon && <activeFeature.icon className="w-4 h-4" />}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-white">{activeFeature.label}</p>
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* LÍMITES PERSONALIZADOS */}
            <div className="mt-6 pt-5 border-t border-neutral-800">
                <h4 className="text-xs font-bold text-neutral-400 mb-4 flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-amber-500" />
                    Límites Personalizados (Override)
                </h4>
                <p className="text-[10px] text-neutral-500 mb-4">
                    Deja vacío para usar el valor del plan. Los valores aquí sobrescriben el plan.
                </p>

                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="block text-[10px] text-neutral-500 mb-1.5">Máx. Proyectos</label>
                        <input
                            type="number"
                            min="-1"
                            placeholder={String(basePlanStats.limits?.maxProjects ?? "∞")}
                            value={currentOverrides?.limits?.maxProjects ?? ""}
                            onChange={(e) => {
                                const val = e.target.value === "" ? undefined : parseInt(e.target.value);
                                onChange({
                                    ...currentOverrides,
                                    limits: { ...currentOverrides?.limits, maxProjects: val }
                                });
                            }}
                            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500 placeholder-neutral-600"
                        />
                        <p className="text-[9px] text-neutral-600 mt-1">-1 = ilimitado</p>
                    </div>

                    <div>
                        <label className="block text-[10px] text-neutral-500 mb-1.5">Máx. Bio (chars)</label>
                        <input
                            type="number"
                            min="0"
                            placeholder={String(basePlanStats.limits?.bioMaxLength ?? "∞")}
                            value={currentOverrides?.limits?.bioMaxLength ?? ""}
                            onChange={(e) => {
                                const val = e.target.value === "" ? undefined : parseInt(e.target.value);
                                onChange({
                                    ...currentOverrides,
                                    limits: { ...currentOverrides?.limits, bioMaxLength: val }
                                });
                            }}
                            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500 placeholder-neutral-600"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] text-neutral-500 mb-1.5">Máx. Nubes</label>
                        <input
                            type="number"
                            min="-1"
                            placeholder={String(basePlanStats.limits?.maxCloudAccounts ?? "∞")}
                            value={currentOverrides?.limits?.maxCloudAccounts ?? ""}
                            onChange={(e) => {
                                const val = e.target.value === "" ? undefined : parseInt(e.target.value);
                                onChange({
                                    ...currentOverrides,
                                    limits: { ...currentOverrides?.limits, maxCloudAccounts: val }
                                });
                            }}
                            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500 placeholder-neutral-600"
                        />
                        <p className="text-[9px] text-neutral-600 mt-1">-1 = ilimitado</p>
                    </div>
                </div>

                {/* Closer Gallery Limit - only show if closerGallery is enabled */}
                {(activeItems.includes('closerGallery') || basePlanStats.features?.closerGallery) && (
                    <div className="mt-4">
                        <label className="block text-[10px] text-neutral-500 mb-1.5">Límite Closer Gallery</label>
                        <input
                            type="number"
                            min="-1"
                            placeholder={String((basePlanStats.limits as any)?.closerGalleryLimit ?? "∞")}
                            value={currentOverrides?.limits?.closerGalleryLimit ?? ""}
                            onChange={(e) => {
                                const val = e.target.value === "" ? undefined : parseInt(e.target.value);
                                onChange({
                                    ...currentOverrides,
                                    limits: { ...currentOverrides?.limits, closerGalleryLimit: val }
                                });
                            }}
                            className="w-full max-w-[150px] px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500 placeholder-neutral-600"
                        />
                        <p className="text-[9px] text-neutral-600 mt-1">-1 = ilimitado</p>
                    </div>
                )}
            </div>
        </div>
    );
}
