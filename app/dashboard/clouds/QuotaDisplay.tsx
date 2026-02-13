"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function QuotaDisplay({ accountId, onError }: { accountId: string, onError?: (error: string) => void }) {
    const [quota, setQuota] = useState<{ usage: number, limit: number } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/cloud/quota?cloudAccountId=${accountId}`)
            .then(res => {
                if (res.status === 401) {
                    if (onError) onError("auth_expired");
                    return null;
                }
                return res.ok ? res.json() : null;
            })
            .then(data => {
                if (data && typeof data.usage === 'number') setQuota(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [accountId, onError]);

    if (loading) return (
        <div className="space-y-4 mb-4 md:mb-8 w-full animate-pulse opacity-50">
            <div className="flex items-end justify-between">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-tighter">Espacio Utilizado</span>
                    <span className="text-lg font-light text-neutral-400 tracking-widest">Calculando...</span>
                </div>
            </div>
            <div className="w-full bg-neutral-800 h-1 rounded-full overflow-hidden" />
        </div>
    );

    if (!quota) return (
        <div className="space-y-4 mb-4 md:mb-8 w-full">
            <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-tighter">Espacio Utilizado</span>
            <div className="text-neutral-500 text-sm">No disponible</div>
        </div>
    );

    const usedGB = (quota.usage / 1024 / 1024 / 1024).toFixed(2);
    const totalGB = quota.limit > 0 ? (quota.limit / 1024 / 1024 / 1024).toFixed(0) : "∞";
    const percent = quota.limit > 0 ? Math.min(100, (quota.usage / quota.limit) * 100) : 0;
    const isFull = percent > 90;

    // Format percentage: show decimal for small values, round for larger ones
    const displayPercent = percent < 1 && percent > 0
        ? percent.toFixed(1)
        : Math.round(percent).toString();

    // Ensure minimum visible width for the progress bar when there's usage
    const barWidth = percent > 0 ? Math.max(percent, 0.5) : 0;

    // SVG circle progress calculations
    const radius = 20;
    const circumference = 2 * Math.PI * radius;
    // For very small percentages, show at least a small visible arc
    const visualPercent = percent > 0 ? Math.max(percent, 2) : 0;
    const strokeDashoffset = circumference - (visualPercent / 100) * circumference;

    return (
        <div className="space-y-4 mb-4 md:mb-8 w-full">
            <div className="flex items-end justify-between">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-tighter">Espacio Utilizado</span>
                    <span className="text-lg font-light text-white tracking-widest">{usedGB} GB <span className="text-neutral-600 text-sm">/ {totalGB} GB</span></span>
                </div>
                {/* SVG Progress Circle */}
                <div className="relative w-12 h-12 hidden md:block">
                    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                        {/* Background circle */}
                        <circle
                            cx="24"
                            cy="24"
                            r={radius}
                            fill="none"
                            stroke={isFull ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)"}
                            strokeWidth="3"
                        />
                        {/* Progress circle */}
                        <circle
                            cx="24"
                            cy="24"
                            r={radius}
                            fill="none"
                            stroke={isFull ? "#ef4444" : "#10b981"}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <span className={cn("absolute inset-0 flex items-center justify-center text-[10px] font-bold", isFull ? "text-red-500" : "text-emerald-500")}>
                        {displayPercent}%
                    </span>
                </div>
            </div>
            <div className="w-full bg-neutral-800 h-1 rounded-full overflow-hidden">
                <div
                    className={cn("h-full rounded-full transition-all duration-1000 ease-out", isFull ? "bg-red-500" : "bg-emerald-500")}
                    style={{ width: `${barWidth}%` }}
                />
            </div>
        </div>
    );
}
