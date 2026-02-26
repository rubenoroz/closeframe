"use client";

import { createContext, useContext } from 'react';

type QuickAddFn = (sourceNodeId: string, color: string, direction: string) => void;

export const QuickAddContext = createContext<QuickAddFn | null>(null);

export function useQuickAdd() {
    return useContext(QuickAddContext);
}
