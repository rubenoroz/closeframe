"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Folder, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Props {
    project: any;
    isLight: boolean;
    toggleVisibility: (id: string, current: boolean) => void;
}

export function SortableProjectItem({ project, isLight, toggleVisibility }: Props) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: project.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex items-center justify-between p-4 rounded-xl border transition-all touch-none select-none",
                isLight
                    ? "bg-white border-neutral-200 hover:border-emerald-500/30"
                    : "bg-neutral-900/30 border-neutral-800 hover:bg-neutral-900 ml-0",
                isDragging && "ring-2 ring-emerald-500 shadow-xl !opacity-90"
            )}
        >
            <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Drag Handle */}
                <div {...attributes} {...listeners} className="cursor-grab hover:text-emerald-500 transition-colors text-neutral-500 shrink-0">
                    <GripVertical className="w-5 h-5" />
                </div>

                <div className={cn(
                    "w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center transition-colors shrink-0",
                    isLight ? "bg-neutral-100 border border-neutral-100" : "bg-neutral-800 border border-neutral-700"
                )}>
                    {project.coverImage && project.cloudAccountId ? (
                        <img
                            src={`/api/cloud/thumbnail?c=${project.cloudAccountId}&f=${project.coverImage}&s=100`}
                            className="w-full h-full object-cover pointer-events-none"
                            alt=""
                        />
                    ) : (
                        <Folder className={cn("w-4 h-4", isLight ? "text-neutral-300" : "text-neutral-600")} />
                    )}
                </div>
                <span className={cn("text-sm font-medium truncate min-w-0 flex-1", isLight ? "text-neutral-900" : "text-white")}>
                    {project.name}
                </span>
            </div>

            <input
                type="checkbox"
                checked={project.showInProfile}
                onChange={() => toggleVisibility(project.id, project.showInProfile)}
                className="w-5 h-5 accent-emerald-500 rounded cursor-pointer ml-3"
            />
        </div>
    );
}
