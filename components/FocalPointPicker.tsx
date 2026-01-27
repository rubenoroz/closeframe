"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Move } from "lucide-react";

interface FocalPointPickerProps {
    imageUrl: string;
    value: string; // "x,y" format (0-100)
    onChange: (value: string) => void;
    className?: string;
}

export default function FocalPointPicker({
    imageUrl,
    value,
    onChange,
    className = ""
}: FocalPointPickerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    // Parse current value
    const [x, y] = (value || "50,50").split(",").map(Number);

    const handleMove = useCallback((clientX: number, clientY: number) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const newX = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
        const newY = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

        onChange(`${Math.round(newX)},${Math.round(newY)}`);
    }, [onChange]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        handleMove(e.clientX, e.clientY);
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging) return;
        handleMove(e.clientX, e.clientY);
    }, [isDragging, handleMove]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Touch handlers for mobile
    const handleTouchStart = (e: React.TouchEvent) => {
        e.preventDefault();
        setIsDragging(true);
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
    };

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!isDragging) return;
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
    }, [isDragging, handleMove]);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
            window.addEventListener("touchmove", handleTouchMove);
            window.addEventListener("touchend", handleMouseUp);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("touchend", handleMouseUp);
        };
    }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

    return (
        <div className={`relative ${className}`}>
            <div
                ref={containerRef}
                className="relative aspect-video rounded-xl overflow-hidden border border-neutral-700 cursor-crosshair select-none"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
            >
                {/* Image */}
                <img
                    src={imageUrl}
                    alt="Focal point preview"
                    className="w-full h-full object-cover"
                    style={{ objectPosition: `${x}% ${y}%` }}
                    onLoad={() => setImageLoaded(true)}
                    draggable={false}
                />

                {/* Overlay grid */}
                <div className="absolute inset-0 pointer-events-none">
                    {/* Rule of thirds grid */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                        {[...Array(9)].map((_, i) => (
                            <div key={i} className="border border-white/10" />
                        ))}
                    </div>
                </div>

                {/* Focal point indicator */}
                {imageLoaded && (
                    <div
                        className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ left: `${x}%`, top: `${y}%` }}
                    >
                        {/* Outer ring */}
                        <div className="absolute inset-0 rounded-full border-2 border-white shadow-lg" />
                        {/* Inner dot */}
                        <div className="absolute inset-2 rounded-full bg-white shadow-md" />
                        {/* Crosshair lines */}
                        <div className="absolute left-1/2 -translate-x-px top-0 bottom-0 w-0.5 bg-white/50" />
                        <div className="absolute top-1/2 -translate-y-px left-0 right-0 h-0.5 bg-white/50" />
                    </div>
                )}

                {/* Drag indicator */}
                {isDragging && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                        <Move className="w-6 h-6 text-white/80" />
                    </div>
                )}
            </div>

            {/* Instructions */}
            <p className="text-[10px] text-neutral-500 mt-1.5 flex items-center gap-1">
                <Move className="w-3 h-3" />
                Arrastra para elegir el punto de enfoque
            </p>
        </div>
    );
}
