"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getProjects, createProject, deleteProject, MindMapProject } from '@/lib/nodos/storage';
import { Plus, Network, Search, MoreVertical, Trash2 } from 'lucide-react';
import CsvUploader from '@/components/nodos/CsvUploader';

// Colores disponibles de Nodos para simular la asignación de color en tarjetas
const CARD_COLORS = [
  'bg-[#ffcfea] text-black',
  'bg-[#d0dbff] text-black',
  'bg-[#fff7cf] text-black',
  'bg-[#ffd6d6] text-black',
  'bg-[#d4ffd6] text-black',
  'bg-[#e9d6ff] text-black'
];

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<MindMapProject[]>([]);
  const [activeTab, setActiveTab] = useState<'activos' | 'archivados'>('activos');

  // Estado para el menú dropdown
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProjects(getProjects());

    // Cerrar dropdown al hacer click fuera
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreateNew = () => {
    const newProject = createProject("Nuevo Proyecto");
    router.push(`/dashboard/nodos/${newProject.id}`);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('¿Seguro que deseas eliminar este proyecto? Esta acción no se puede deshacer.')) {
      deleteProject(id);
      setProjects(getProjects());
      setMenuOpenId(null);
    }
  };

  const toggleMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setMenuOpenId(prev => prev === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-[#0E0E0E] text-neutral-200 font-sans">
      <div className="mx-auto w-full max-w-[1400px]">
        {/* Superior Top Bar as seen in Scena */}
        <header className="flex items-center justify-between px-8 md:px-12 py-5 bg-[#141414] border-b border-[#1E1E1E]">
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

            <CsvUploader onProjectCreated={(id: string) => router.push(`/dashboard/nodos/${id}`)} />

            <button
              onClick={handleCreateNew}
              className="px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white text-sm font-medium rounded-md transition-all flex items-center gap-2 active:scale-95"
            >
              <Plus size={16} />
              <span>Nuevo Proyecto</span>
            </button>
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
          </div>
        </div>

        {/* Project Grid */}
        <main className="p-8 md:p-12">
          {projects.length === 0 ? (
            <div className="text-center py-32 rounded-3xl border border-dashed border-neutral-800 bg-neutral-900/20">
              <p className="text-neutral-500">Aún no hay mapas mentales.</p>
              <button onClick={handleCreateNew} className="mt-4 text-white font-medium hover:underline">
                Crear el primero
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 ml:grid-cols-3 lg:grid-cols-4 gap-4">
              {projects.sort((a, b) => b.updatedAt - a.updatedAt).map((project, index) => {
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
                          <button
                            onClick={(e) => handleDelete(e, project.id)}
                            className="w-full px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2 transition-colors text-left"
                          >
                            <Trash2 size={14} />
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-[17px] font-bold tracking-tight pr-8 leading-snug truncate">{project.title}</h3>
                      <p className="text-[13px] mt-3 leading-relaxed opacity-80 line-clamp-3">
                        Última edición: {new Date(project.updatedAt).toLocaleDateString()}
                        <br />
                        Contenido: {project.nodes.length} Nodos y {project.edges.length} Conexiones mapeadas en memoria.
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
