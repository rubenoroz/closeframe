"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
  MarkerType,
  ConnectionMode
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import MindMapNode from '@/components/nodos/MindMapNode';
import MindMapEdge from '@/components/nodos/MindMapEdge';
import ContextMenu from '@/components/nodos/ContextMenu';
import PropertiesPanel from '@/components/nodos/PropertiesPanel';
import SearchMenu from '@/components/nodos/SearchMenu';
import { QuickAddContext } from '@/components/nodos/QuickAddContext';

import { Plus, ChevronLeft } from 'lucide-react';

const nodeTypes = {
  mindmap: MindMapNode,
};

const edgeTypes = {
  mindmap: MindMapEdge,
};

function FlowCanvas({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<any>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [menu, setMenu] = useState<{ id: string, top: number, left: number } | null>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const { fitView, getNode, getNodes, getEdges, deleteElements, screenToFlowPosition } = useReactFlow();

  // Flag to prevent onConnect from firing during QuickAdd
  const isQuickAddingRef = useRef(false);

  // Load project on mount
  useEffect(() => {
    const loadProject = async () => {
      try {
        const res = await fetch(`/api/nodos/projects/${projectId}`);
        if (!res.ok) {
          router.push('/dashboard/nodos');
          return;
        }
        const p = await res.json();
        setProject(p);
        setNodes(p.nodes || []);
        setEdges(p.edges || []);

        setTimeout(() => {
          fitView({ duration: 800, padding: 0.5, maxZoom: 1 });
        }, 100);
      } catch {
        router.push('/dashboard/nodos');
      }
    };
    loadProject();
  }, [projectId, router, setNodes, setEdges, fitView]);

  // Auto-save to database whenever nodes or edges mutate (debounce)
  useEffect(() => {
    if (project && nodes.length > 0) {
      const timeoutId = setTimeout(() => {
        fetch(`/api/nodos/projects/${project.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodes, edges }),
        }).catch(err => console.error('Auto-save error:', err));
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [nodes, edges, project]);

  const focusNode = useCallback((nodeId: string) => {
    fitView({ nodes: [{ id: nodeId }], duration: 800, padding: 0.5, maxZoom: 1 });
  }, [fitView]);

  const onQuickAdd = useCallback((sourceNodeId: string, color: string, direction: string = 'right') => {
    const sourceNode = getNode(sourceNodeId);
    if (!sourceNode) return;

    // Block onConnect from firing while we create the node+edge
    isQuickAddingRef.current = true;

    const newNodeId = `node-${Date.now()}`;
    let newNodePosition = { ...sourceNode.position };
    let sourceHandle = 'right-source';
    let targetHandle = 'left-target';

    switch (direction) {
      case 'left':
        newNodePosition.x -= 250;
        sourceHandle = 'left-source';
        targetHandle = 'right-target';
        break;
      case 'top':
        newNodePosition.y -= 150;
        sourceHandle = 'top-source';
        targetHandle = 'bottom-target';
        break;
      case 'bottom':
        newNodePosition.y += 150;
        sourceHandle = 'bottom-source';
        targetHandle = 'top-target';
        break;
      case 'right':
      default:
        newNodePosition.x += 250;
        sourceHandle = 'right-source';
        targetHandle = 'left-target';
        break;
    }

    const newNode: Node = {
      id: newNodeId,
      type: 'mindmap',
      position: newNodePosition,
      data: { label: 'Nuevo Nodo', color: color || 'default', shape: 'card' },
      selected: true,
    };

    const newEdge: Edge = {
      id: `e${sourceNodeId}-${newNodeId}`,
      source: sourceNodeId,
      target: newNodeId,
      sourceHandle,
      targetHandle,
      type: 'mindmap',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6b6b6b' }
    };

    setNodes((nds) => {
      const updatedNodes = nds.map(n => ({ ...n, selected: false }));
      return [...updatedNodes, newNode];
    });
    setEdges((eds) => eds.concat(newEdge));
    setSelectedNode(newNode);

    setTimeout(() => {
      fitView({ nodes: [{ id: newNodeId }], duration: 800, padding: 0.5, maxZoom: 1 });
      // Allow onConnect again after RF has fully processed
      isQuickAddingRef.current = false;
    }, 200);
  }, [getNode, setNodes, setEdges, setSelectedNode, fitView]);



  const onSelectionChange = useCallback(({ nodes }: any) => {
    if (nodes.length === 1) {
      setSelectedNode(nodes[0]);
    } else {
      setSelectedNode(null);
    }
  }, []);

  const updateNodeData = useCallback((id: string, newData: any) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === id) {
          const updatedNode = { ...n, data: { ...n.data, ...newData } };
          if (selectedNode?.id === id) {
            setSelectedNode(updatedNode);
          }
          return updatedNode;
        }
        return n;
      })
    );
  }, [setNodes, selectedNode]);

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      // Block connections triggered by React Flow during QuickAdd
      if (isQuickAddingRef.current) return;
      setEdges((eds) => {
        // Prevent strictly self-connecting a node to itself
        if (params.source === params.target) return eds;

        // Bypass React Flow's addEdge function because it aggressively deduplicates by source+target
        // even if we supply a unique ID and different handles.
        const uniqueEdgeId = `e${params.source}-${params.target}-${params.sourceHandle}-${params.targetHandle}`;

        // Don't add if this EXACT connection already exists
        if (eds.some(e => e.id === uniqueEdgeId)) return eds;

        const newEdge: Edge = {
          ...params as any,
          id: uniqueEdgeId,
          type: 'mindmap',
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#6b6b6b' }
        };

        return [...eds, newEdge];
      });
    },
    [setEdges]
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: any) => {
      event.preventDefault();
      setMenu({
        id: node.id,
        top: event.clientY,
        left: event.clientX,
      });
    },
    [setMenu]
  );

  const onPaneClick = useCallback(() => setMenu(null), [setMenu]);



  const duplicateNode = useCallback(() => {
    if (!menu) return;
    const nodeToDuplicate = nodes.find((n) => n.id === menu.id);
    if (nodeToDuplicate) {
      const newNode = {
        ...nodeToDuplicate,
        id: `${nodeToDuplicate.id}-copy-${Date.now()}`,
        position: {
          x: nodeToDuplicate.position.x + 50,
          y: nodeToDuplicate.position.y + 50,
        },
        selected: false,
      };
      setNodes((nds) => nds.concat(newNode));
    }
    setMenu(null);
  }, [menu, nodes, setNodes]);

  const deleteNode = useCallback(() => {
    if (!menu) return;

    // Force synchronous read of currently selected items to prevent closure staleness
    const currentNodes = getNodes();

    // Check if the right-clicked node is part of a current multi-selection
    const isSelected = currentNodes.some(n => n.id === menu.id && n.selected);

    if (isSelected) {
      const selectedNodeIds = new Set(currentNodes.filter(n => n.selected).map(n => n.id));
      setNodes(nds => nds.filter(n => !selectedNodeIds.has(n.id)));
      setEdges(eds => eds.filter(e => !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target)));
    } else {
      // Just delete the specific node right-clicked
      setNodes((nds) => nds.filter((node) => node.id !== menu.id));
      setEdges((eds) => eds.filter((edge) => edge.source !== menu.id && edge.target !== menu.id));
    }
    setMenu(null);
  }, [menu, getNodes, setNodes, setEdges]);

  // Restored and fixed custom keyboard listener for absolute multi-delete reliability
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

        // Force synchronous read of currently selected items to prevent closure staleness
        const currentNodes = getNodes();
        const currentEdges = getEdges();

        const selectedNodes = currentNodes.filter(n => n.selected);
        const selectedEdges = currentEdges.filter(e => e.selected);

        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
          e.preventDefault();
          // Use direct state updates instead of deleteElements to bypass RF internal batching bugs
          setNodes(nds => nds.filter(n => !n.selected));
          setEdges(eds => eds.filter(e => !e.selected && !selectedNodes.some(n => n.id === e.source || n.id === e.target)));
          setSelectedNode(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [getNodes, getEdges, setNodes, setEdges, setSelectedNode]);

  const NODOS_COLORS = ['#ffcfea', '#d0dbff', '#fff7cf', '#ffd6d6', '#d4ffd6', '#e9d6ff'];

  const addNewNode = useCallback(() => {
    const newNodeId = `node-${Date.now()}`;
    const randomColor = NODOS_COLORS[Math.floor(Math.random() * NODOS_COLORS.length)];

    // Convert viewport center to flow coordinates
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const position = screenToFlowPosition({ x: centerX, y: centerY });

    const newNode = {
      id: newNodeId,
      type: 'mindmap',
      position,
      data: { label: 'Nuevo Nodo', color: randomColor, shape: 'card' },
      selected: true,
    };

    setNodes((nds) => [...nds.map(n => ({ ...n, selected: false })), newNode]);
    setSelectedNode(newNode);
  }, [setNodes, setSelectedNode, screenToFlowPosition]);

  if (!project) return null;

  return (
    <>
      {/* Top Bar */}
      <div className="shrink-0 relative z-50 flex items-center justify-between md:justify-start gap-3 p-4 md:pt-6 md:pb-4 pointer-events-none bg-neutral-900 border-b border-neutral-800 md:bg-transparent md:border-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={() => router.push('/dashboard/nodos')}
            className="w-10 h-10 md:w-8 md:h-8 bg-neutral-800 md:bg-neutral-900 border border-neutral-700 md:border-neutral-800 hover:bg-neutral-700 md:hover:bg-neutral-800 rounded-full flex items-center justify-center text-white transition-colors shadow-lg group shrink-0"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <span className="text-white text-sm font-semibold tracking-tight line-clamp-1 max-w-[180px] md:max-w-xs">{project.title}</span>
        </div>
        <button
          onClick={addNewNode}
          className="w-10 h-10 md:w-8 md:h-8 bg-emerald-600 md:bg-neutral-900/90 border border-emerald-500 md:border-neutral-700 hover:bg-emerald-500 md:hover:border-emerald-500 rounded-full flex items-center justify-center text-white md:text-neutral-400 md:hover:text-white transition-all shadow-lg pointer-events-auto shrink-0"
          title="Añadir nodo independiente"
        >
          <Plus size={18} className="md:w-4 md:h-4" />
        </button>
      </div>

      <div className="flex-1 relative w-full h-full">
        <QuickAddContext.Provider value={onQuickAdd}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={onSelectionChange}
            onNodeContextMenu={onNodeContextMenu}
            onPaneClick={onPaneClick}
            fitView
            colorMode="dark"
            edgesReconnectable={false}
            proOptions={{ hideAttribution: true }}
            preventScrolling={true}
            panOnDrag={true}
            selectionOnDrag={false}
            fitViewOptions={{ padding: 0.2 }}
          >
            <Controls showInteractive={false} />
            <Background variant={BackgroundVariant.Dots} gap={24} size={2} color="#1f1f1f" />
          </ReactFlow>
        </QuickAddContext.Provider>
      </div>


      {menu && (
        <ContextMenu
          id={menu.id}
          top={menu.top}
          left={menu.left}
          label={nodes.find(n => n.id === menu.id)?.data?.label as string}
          onDuplicate={duplicateNode}
          onDelete={deleteNode}
        />
      )
      }



      <PropertiesPanel
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        onUpdate={updateNodeData}
      />

      <SearchMenu
        nodes={nodes}
        onSelectNode={focusNode}
      />
    </>
  );
}

function MapPage() {
  const params = useParams();
  const id = params?.id as string;

  if (!id) return null;

  return (
    <div className="w-[calc(100%+2rem)] md:w-[calc(100%+4rem)] lg:w-[calc(100%+6rem)] h-[calc(100dvh-3.5rem)] md:h-[100dvh] bg-[#030303] flex flex-col relative overflow-hidden -m-4 md:-m-8 lg:-m-12">
      <ReactFlowProvider>
        <FlowCanvas projectId={id} />
      </ReactFlowProvider>
    </div>
  );
}

import dynamic from 'next/dynamic';
export default dynamic(() => Promise.resolve(MapPage), { ssr: false });
