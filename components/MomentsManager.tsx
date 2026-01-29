"use client";

import React from "react";
import { Folder } from "lucide-react";

interface MomentsManagerProps {
    // For now, let's keep it simple as a display since sorting logic requires
    // fetching structure first which might be overkill for this iteration.
    // Ideally we would fetch folders here and let user reorder.
    cloudAccountId: string;
    rootFolderId: string;
}

export default function MomentsManager({ cloudAccountId, rootFolderId }: MomentsManagerProps) {
    // TODO: Implement Drag and Drop reordering of folders.
    // This requires:
    // 1. Fetching current folders
    // 2. Checking 'momentsOrder' from project settings
    // 3. Applying sort
    // 4. Saving new order

    return (
        <div className="p-4 rounded-xl border border-dashed border-neutral-800 bg-neutral-900/30 text-center">
            <div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <Folder className="w-5 h-5 text-neutral-500" />
            </div>
            <p className="text-sm text-neutral-400 mb-1">Orden Automático</p>
            <p className="text-xs text-neutral-600">
                Los momentos se detectan automáticamente de las carpetas en Drive.
                <br />
                En la próxima actualización podrás reordenarlos aquí.
            </p>
        </div>
    );
}
