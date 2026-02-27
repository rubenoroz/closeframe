"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Plus, Network, Search, MoreVertical, Trash2, Archive, RotateCcw, LogOut, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import CsvUploader from '@/components/nodos/CsvUploader';
import { CreateNodosProjectModal } from '@/components/nodos/CreateNodosProjectModal';
import { NodosInvitationList } from '@/components/nodos/NodosInvitationList';

// Colores disponibles de Nodos para simular la asignación de color en tarjetas
const CARD_COLORS = [
  'bg-[#ffcfea] text-black',
  'bg-[#d0dbff] text-black',
  'bg-[#fff7cf] text-black',
  'bg-[#ffd6d6] text-black',
  'bg-[#d4ffd6] text-black',
  'bg-[#e9d6ff] text-black'
];

interface NodosProject {
  id: string;
  title: string;
  description: string | null;
  nodes: any[];
  edges: any[];
  isArchived: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export default function DashboardPage({
  canCreate = true,
  initialInvitations = []
}: {
  canCreate?: boolean;
  initialInvitations?: any[];
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [projects, setProjects] = useState<NodosProject[]>([]);
  const [invitations, setInvitations] = useState<any[]>(initialInvitations);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'activos' | 'archivados' | 'invitaciones'>('activos');

  // Estado para el menú dropdown
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/nodos/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();

    // Check for acceptance token in URL
    const searchParams = new URLSearchParams(window.location.search);
    const acceptToken = searchParams.get('accept');

    if (acceptToken) {
      const acceptInvite = async () => {
        try {
          const res = await fetch('/api/nodos/invitations/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: acceptToken }),
          });

          if (res.ok) {
            toast.success('Te has unido al proyecto correctamente');
            // Remove the token from URL without reload
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
            fetchProjects();
          } else {
            const data = await res.json();
            if (data.error) toast.error(data.error);
          }
        } catch (err) {
          console.error('Error accepting invite from URL:', err);
        }
      };
      acceptInvite();
    }

    // Cerrar dropdown al hacer click fuera
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [fetchProjects]);

  const handleCreateNew = () => {
    setShowCreateModal(true);
  };

  const handleProjectCreated = (id: string) => {
    router.push(`/dashboard/nodos/${id}`);
  };

  const handleDelete = async (e: React.MouseEvent, project: NodosProject) => {
    e.stopPropagation();
    const isOwner = project.ownerId === session?.user?.id;
    const confirmMsg = isOwner
      ? '¿Seguro que deseas eliminar este proyecto? Esta acción no se puede deshacer.'
      : '¿Seguro que deseas salir de este proyecto? Ya no aparecerá en tu panel, pero seguirá disponible para el dueño.';

    if (confirm(confirmMsg)) {
      try {
        const res = await fetch(`/api/nodos/projects/${project.id}`, { method: 'DELETE' });
        if (res.ok) {
          setProjects(prev => prev.filter(p => p.id !== project.id));
          setMenuOpenId(null);
          toast.success(isOwner ? 'Proyecto eliminado' : 'Has salido del proyecto');
        }
      } catch (err) {
        console.error('Error deleting project:', err);
      }
    }
  };

  const handleToggleArchive = async (e: React.MouseEvent, project: NodosProject) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/nodos/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: !project.isArchived }),
      });
      if (res.ok) {
        setProjects(prev => prev.map(p => p.id === project.id ? { ...p, isArchived: !project.isArchived } : p));
        setMenuOpenId(null);
        toast.success(project.isArchived ? 'Proyecto desarchivado' : 'Proyecto archivado');
      }
    } catch (err) {
      console.error('Error toggling archive:', err);
      toast.error('Error al actualizar el estado del proyecto');
    }
  };

  const toggleMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setMenuOpenId(prev => prev === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-[#0E0E0E] text-neutral-200 font-sans flex flex-col -m-4 md:-m-8 lg:-m-12">
      <div className="mx-auto w-full w-full">
        {/* Superior Top Bar as seen in Scena */}
        <header className="flex items-center justify-between px-8 md:px-12 p-4 md:py-2 md:pt-2 md:pb-4 border-b border-[#1E1E1E] bg-[#141414]">
          <div className="flex items-center gap-3">
            <Network size={24} className="text-emerald-500" />
            <h1 className="text-xl font-semibold text-white tracking-tight">Mis Proyectos</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
              <input
                type="text"
                placeholder="Buscar proyecto..."
                className="w-64 pl-10 pr-4 py-2 bg-[#1C1C1C] border border-[#2B2B2B] text-sm text-white rounded-lg focus:outline-none focus:border-emerald-500/50 transition-colors placeholder:text-neutral-500"
              />
            </div>

            {canCreate && <CsvUploader onProjectCreated={(id: string) => router.push(`/dashboard/nodos/${id}`)} />}

            {canCreate && (
              <button
                onClick={handleCreateNew}
                className="px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white text-sm font-medium rounded-md transition-all flex items-center gap-2 active:scale-95"
              >
                <Plus size={16} />
                <span>Nuevo Proyecto</span>
              </button>
            )}
          </div>
        </header>

        {/* Tabs Bar */}
        <div className="px-8 md:px-12 pt-6 pb-0 border-b border-[#1E1E1E]">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('activos')}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'activos' ? 'text-emerald-500 border-emerald-500' : 'text-neutral-500 border-transparent hover:text-neutral-300'}`}
            >
              Activos
            </button>
            <button
              onClick={() => setActiveTab('archivados')}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'archivados' ? 'text-emerald-500 border-emerald-500' : 'text-neutral-500 border-transparent hover:text-neutral-300'}`}
            >
              Archivados
            </button>
            <button
              onClick={() => setActiveTab('invitaciones')}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'invitaciones' ? 'text-emerald-500 border-emerald-500' : 'text-neutral-500 border-transparent hover:text-neutral-300'}`}
            >
              Invitaciones
              {invitations.length > 0 && (
                <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {invitations.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Project Grid */}
        <main className="p-8 md:p-12">
          {loading ? (
            <div className="text-center py-32">
              <p className="text-neutral-500">Cargando proyectos...</p>
            </div>
          ) : activeTab === 'invitaciones' ? (
            <div className="max-w-4xl">
              <NodosInvitationList initialInvitations={invitations} />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-32 rounded-3xl border border-dashed border-neutral-800 bg-neutral-900/20">
              <p className="text-neutral-500">Aún no hay mapas mentales.</p>
              {canCreate && (
                <button onClick={handleCreateNew} className="mt-4 text-white font-medium hover:underline">
                  Crear el primero
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 ml:grid-cols-3 lg:grid-cols-4 gap-4">
              {projects.filter(p => activeTab === 'activos' ? !p.isArchived : p.isArchived).map((project, index) => {
                // Asignar un color visual basado en el índice para igualar Scena
                const colorClass = CARD_COLORS[index % CARD_COLORS.length];
                const isMenuOpen = menuOpenId === project.id;

                return (
                  <div
                    key={project.id}
                    onClick={() => router.push(`/dashboard/nodos/${project.id}`)}
                    className={`group relative h-[180px] rounded-[16px] overflow-visible cursor-pointer transition-all hover:-translate-y-1 p-5 flex flex-col justify-between shadow-sm hover:shadow-xl ${colorClass}`}
                  >
                    {/* Botón de Context Menu (3 puntos) arriba a la derecha */}
                    <div className="absolute top-4 right-4 z-10" ref={isMenuOpen ? menuRef : null}>
                      <button
                        onClick={(e) => toggleMenu(e, project.id)}
                        className={`p-1.5 rounded-full transition-colors ${isMenuOpen ? 'bg-black/10' : 'hover:bg-black/10'}`}
                      >
                        <MoreVertical size={16} className="opacity-60" />
                      </button>

                      {/* Dropdown del menú */}
                      {isMenuOpen && (
                        <div
                          className="absolute right-0 top-8 mt-1 w-40 bg-[#1C1C1C] border border-[#2B2B2B] rounded-lg shadow-2xl py-1 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                        >
                          {project.ownerId === session?.user?.id && (
                            <button
                              onClick={(e) => handleToggleArchive(e, project)}
                              className="w-full px-4 py-2 text-sm text-neutral-300 hover:bg-white/5 flex items-center gap-2 transition-colors text-left"
                            >
                              {project.isArchived ? (
                                <>
                                  <RotateCcw size={14} />
                                  Desarchivar
                                </>
                              ) : (
                                <>
                                  <Archive size={14} />
                                  Archivar
                                </>
                              )}
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDelete(e, project)}
                            className="w-full px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2 transition-colors text-left border-t border-neutral-800"
                          >
                            {project.ownerId === session?.user?.id ? (
                              <>
                                <Trash2 size={14} />
                                Eliminar
                              </>
                            ) : (
                              <>
                                <LogOut size={14} />
                                Salir del proyecto
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-[17px] font-bold tracking-tight pr-8 leading-snug truncate">{project.title}</h3>
                      <p className="text-[13px] mt-3 leading-relaxed opacity-80 line-clamp-3">
                        Última edición: {new Date(project.updatedAt).toLocaleDateString()}
                        <br />
                        Contenido: {(project.nodes as any[]).length} Nodos y {(project.edges as any[]).length} Conexiones mapeadas.
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>

        <CreateNodosProjectModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onProjectCreated={handleProjectCreated}
        />
      </div>
    </div>
  );
}
