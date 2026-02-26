"use client";

import React, { useCallback, useEffect, useState } from 'react';
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

  const { fitView, getNode } = useReactFlow();

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
      markerEnd: { type: MarkerType.ArrowClosed, color: '#404040' }
    };

    setNodes((nds) => {
      const updatedNodes = nds.map(n => ({ ...n, selected: false }));
      return [...updatedNodes, newNode];
    });
    setEdges((eds) => eds.concat(newEdge));
    setSelectedNode(newNode);

    setTimeout(() => fitView({ nodes: [{ id: newNodeId }], duration: 800, padding: 0.5, maxZoom: 1 }), 50);
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
    (params: Connection | Edge) => setEdges((eds) => {
      if (params.source === params.target) return eds;
      const filteredEdges = eds.filter(e => !(e.source === params.source && e.target === params.target) && !(e.source === params.target && e.target === params.source));
      return addEdge({ ...params, type: 'mindmap', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#404040' } }, filteredEdges);
    }),
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
    setNodes((nds) => nds.filter((node) => node.id !== menu.id));
    setEdges((eds) => eds.filter((edge) => edge.source !== menu.id && edge.target !== menu.id));
    setMenu(null);
  }, [menu, setNodes, setEdges]);

  // Delete selected nodes with Delete/Backspace key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Don't delete if user is typing in an input/textarea
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

        const selectedNodes = nodes.filter(n => n.selected);
        if (selectedNodes.length === 0) return;

        const selectedIds = new Set(selectedNodes.map(n => n.id));
        setNodes(nds => nds.filter(n => !selectedIds.has(n.id)));
        setEdges(eds => eds.filter(e => !selectedIds.has(e.source) && !selectedIds.has(e.target)));
        setSelectedNode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, setNodes, setEdges, setSelectedNode]);

  const NODOS_COLORS = ['#ffcfea', '#d0dbff', '#fff7cf', '#ffd6d6', '#d4ffd6', '#e9d6ff'];

  const addNewNode = useCallback(() => {
    const newNodeId = `node-${Date.now()}`;
    const randomColor = NODOS_COLORS[Math.floor(Math.random() * NODOS_COLORS.length)];

    // Place near center of the viewport
    const position = {
      x: 200 + Math.random() * 200,
      y: 200 + Math.random() * 200,
    };

    const newNode = {
      id: newNodeId,
      type: 'mindmap',
      position,
      data: { label: 'Nuevo Nodo', color: randomColor, shape: 'card' },
      selected: true,
    };

    setNodes((nds) => [...nds.map(n => ({ ...n, selected: false })), newNode]);
    setSelectedNode(newNode);
  }, [setNodes, setSelectedNode]);

  if (!project) return null;

  return (
    <>
      {/* Top Bar Overlay */}
      <div className="absolute top-6 left-6 z-50 flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard/nodos')}
          className="w-10 h-10 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 rounded-full flex items-center justify-center text-white transition-colors shadow-lg group"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
        </button>
        <span className="text-white text-sm font-semibold tracking-tight">{project.title}</span>
      </div>

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
          connectionMode={ConnectionMode.Loose}
          proOptions={{ hideAttribution: true }}
        >
          <Controls showInteractive={false} />
          <Background variant={BackgroundVariant.Dots} gap={24} size={2} color="#1f1f1f" />
        </ReactFlow>
      </QuickAddContext.Provider>

      {menu && (
        <ContextMenu
          id={menu.id}
          top={menu.top}
          left={menu.left}
          label={nodes.find(n => n.id === menu.id)?.data?.label as string}
          onDuplicate={duplicateNode}
          onDelete={deleteNode}
        />
      )}

      {/* Discrete add node button */}
      <button
        onClick={addNewNode}
        className="absolute bottom-6 right-6 z-50 w-10 h-10 bg-neutral-900/80 border border-neutral-800 hover:bg-neutral-800 rounded-full flex items-center justify-center text-neutral-400 hover:text-white transition-all shadow-lg hover:scale-110 active:scale-95"
        title="Añadir nodo independiente"
      >
        <Plus size={18} />
      </button>

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
    <div style={{ width: '100%', height: '100vh', background: '#030303', position: 'relative' }}>
      <ReactFlowProvider>
        <FlowCanvas projectId={id} />
      </ReactFlowProvider>
    </div>
  );
}

import dynamic from 'next/dynamic';
export default dynamic(() => Promise.resolve(MapPage), { ssr: false });
