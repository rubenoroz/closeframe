"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Move } from "lucide-react";

interface FocalPointPickerProps {
    imageUrl: string;
    value: string; // "x,y" format (0-100)
    onChange: (value: string) => void;
    className?: string;
    showMask?: boolean;
}

export default function FocalPointPicker({
    imageUrl,
    value,
    onChange,
    className = "",
    showMask = false
}: FocalPointPickerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    // Parse value: "x,y,scale" defaulting to "50,50,1"
    const parts = (value || "50,50,1").split(",").map(Number);
    const x = parts[0] !== undefined ? parts[0] : 50;
    const y = parts[1] !== undefined ? parts[1] : 50;
    const scale = parts[2] !== undefined ? parts[2] : 1;

    // Refs for drag state
    const dragStartRef = useRef<{ x: number, y: number } | null>(null);
    const initialPosRef = useRef<{ x: number, y: number } | null>(null);

    const handleStart = (clientX: number, clientY: number) => {
        setIsDragging(true);
        dragStartRef.current = { x: clientX, y: clientY };
        initialPosRef.current = { x, y };
    };

    const handleMoveLogic = useCallback((clientX: number, clientY: number) => {
        if (!isDragging || !dragStartRef.current || !initialPosRef.current || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();

        // Calculate movement as percentage of container
        // Movement is inverted because dragging image left means increasing X position of background?
        // Wait, standard object-position: 50% 50%
        // Dragging left (negative deltaX) should show more of right side -> position increases?
        // Actally, dragging "the image" left reveals the right side.
        // If background-position-x is 0%, image is at left. 100% is right.
        // If I drag LEFT, I want the image to move left.
        // Moving image left means showing more of the right part?
        // No, let's think:
        // Viewport is fixed. Image is behind.
        // Drag LEFT -> Image moves LEFT -> We see more of the RIGHT side of image.
        // object-position: 0% = Left edge of image aligned with left edge of box.
        // object-position: 100% = Right edge of image aligned with right edge of box.
        // If I move image LEFT, I go from 0% towards 100%.
        // So dragging LEFT (negative delta) means INCREASING %.
        // Dragging RIGHT (positive delta) means DECREASING %.

        const deltaX = clientX - dragStartRef.current.x;
        const deltaY = clientY - dragStartRef.current.y;

        // Sensitivity factor: if scaled up, we need less movement?
        // Let's just map pixels to percentage.
        const percentChangeX = (deltaX / rect.width) * 100;
        const percentChangeY = (deltaY / rect.height) * 100;

        // Invert direction for "dragging content" feel
        const newX = Math.max(0, Math.min(100, initialPosRef.current.x - percentChangeX));
        const newY = Math.max(0, Math.min(100, initialPosRef.current.y - percentChangeY));

        onChange(`${Math.round(newX)},${Math.round(newY)},${scale}`);
    }, [isDragging, onChange, scale, x, y]); // Include scale/x/y if needed for recalculation, but Refs handle current drag

    const handleZoom = (newScale: number) => {
        onChange(`${x},${y},${newScale}`);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        handleStart(e.clientX, e.clientY);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        // e.preventDefault(); // Don't prevent default immediately to allow scrolling if not dragging?
        // But for a picker, we usually want to capture.
        const touch = e.touches[0];
        handleStart(touch.clientX, touch.clientY);
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        handleMoveLogic(e.clientX, e.clientY);
    }, [isDragging, handleMoveLogic]);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!isDragging) return;
        e.preventDefault(); // Prevent scroll while dragging
        const touch = e.touches[0];
        handleMoveLogic(touch.clientX, touch.clientY);
    }, [isDragging, handleMoveLogic]);

    const handleEnd = useCallback(() => {
        setIsDragging(false);
        dragStartRef.current = null;
        initialPosRef.current = null;
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleEnd);
            window.addEventListener("touchmove", handleTouchMove, { passive: false });
            window.addEventListener("touchend", handleEnd);
            window.addEventListener("touchcancel", handleEnd);
        }
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleEnd);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("touchend", handleEnd);
            window.removeEventListener("touchcancel", handleEnd);
        };
    }, [isDragging, handleMouseMove, handleTouchMove, handleEnd]);

    return (
        <div className={`relative group ${className}`}>
            <div
                ref={containerRef}
                className={`relative w-full h-full overflow-hidden select-none bg-neutral-900 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
            >
                <img
                    src={imageUrl}
                    alt="Cover preview"
                    className="w-full h-full object-cover pointer-events-none transition-transform duration-75 ease-out" // Fast transition for smooth zoom, instant for drag?
                    style={{
                        objectPosition: `${x}% ${y}%`,
                        transform: `scale(${scale})`
                    }}
                    onLoad={() => setImageLoaded(true)}
                    draggable={false}
                />

                {/* Visual Grid only when dragging or hovering */}
                <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${isDragging ? 'opacity-50' : 'opacity-0 group-hover:opacity-30'}`}>
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                        {[...Array(9)].map((_, i) => (
                            <div key={i} className="border border-white/20" />
                        ))}
                    </div>
                </div>

                {/* Instructions */}
                {!isDragging && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-1000">
                        <div className="bg-black/40 backdrop-blur px-3 py-1.5 rounded-full text-[10px] sm:text-xs text-white/90 flex items-center gap-2">
                            <Move className="w-3 h-3" /> Arrastra para mover
                        </div>
                    </div>
                )}
            </div>

            {/* Slider Control Overlay - Compact */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[90%] max-w-[200px] bg-black/70 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0 shadow-lg border border-white/10">
                <span className="text-[9px] font-bold text-white/80 uppercase tracking-wider">Zoom</span>
                <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.1"
                    value={scale}
                    onChange={(e) => handleZoom(parseFloat(e.target.value))}
                    className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
                />
                <span className="text-[9px] font-mono text-emerald-400 w-6 text-right">{scale.toFixed(1)}x</span>
            </div>
        </div>
    );
}
