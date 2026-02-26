import React from 'react';
import { BaseEdge, EdgeProps, getBezierPath, EdgeLabelRenderer, useReactFlow } from '@xyflow/react';
import { X } from 'lucide-react';

export default function MindMapEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
}: EdgeProps) {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const { setEdges } = useReactFlow();

    const onEdgeClick = () => {
        setEdges((edges) => edges.filter((e) => e.id !== id));
    };

    return (
        <>
            <BaseEdge
                id={id}
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    ...style,
                    strokeWidth: 2.5,
                    stroke: '#6b6b6b',
                    transition: 'stroke 0.3s ease',
                }}
            />
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'all',
                    }}
                    className="nodrag nopan opacity-0 hover:opacity-100 transition-opacity duration-200"
                >
                    <button
                        className="p-1 rounded-full bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/50 hover:shadow-[0_0_10px_rgba(239,68,68,0.2)] transition-all"
                        onClick={onEdgeClick}
                        title="Eliminar conexión"
                    >
                        <X size={12} strokeWidth={3} />
                    </button>
                </div>
            </EdgeLabelRenderer>
        </>
    );
}
