"use client";

import { useState, useEffect, useMemo } from "react";
import { defaultTemplateContent, TemplateContent } from "@/types/profile-v2";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Evita que los inputs pierdan foco y resetee el scroll en la página al teclear
const SortableItem = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group/module">
      <div
        {...attributes}
        {...listeners}
        className="absolute right-3 top-3 p-1.5 bg-[#333] border border-[#444] rounded-lg cursor-grab active:cursor-grabbing opacity-60 group-hover/module:opacity-100 transition-all z-20 shadow-xl hover:bg-[#444] hover:border-[#555]"
        title="Arrastrar para reordenar"
      >
        <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
          <circle cx="9" cy="10" r="1.5" /><circle cx="15" cy="10" r="1.5" />
          <circle cx="9" cy="15" r="1.5" /><circle cx="15" cy="15" r="1.5" />
          <circle cx="9" cy="20" r="1.5" /><circle cx="15" cy="20" r="1.5" />
        </svg>
      </div>
      {children}
    </div>
  );
};

export default function ProfileV2Page() {
  const [data, setData] = useState<TemplateContent>(defaultTemplateContent);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [showHeroModal, setShowHeroModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingHero, setIsDraggingHero] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, posX: 50, posY: 50 });
  const [heroDragMode, setHeroDragMode] = useState<'image' | 'viewport'>('image');
  const [heroImageNaturalSize, setHeroImageNaturalSize] = useState({ width: 1920, height: 1080 });
  const [socialDragIdx, setSocialDragIdx] = useState<number | null>(null);
  const [socialDragOverIdx, setSocialDragOverIdx] = useState<number | null>(null);
  const [userGalleries, setUserGalleries] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Generador Base64 para evitar depender del file system local en Vercel
  const processFileAsBase64 = (file: File, callback: (base64: string) => void) => {
    if (file.size > 2 * 1024 * 1024) {
      alert("La imagen es demasiado grande. El límite es 2MB.");
      setIsUploading(false);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      let result = event.target?.result as string;
      if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
        if (!result.startsWith('data:image/svg+xml')) {
          result = result.replace('data:image/octet-stream', 'data:image/svg+xml')
            .replace('data:text/plain', 'data:image/svg+xml');
        }
      }
      callback(result);
      setIsUploading(false);
    };
    reader.onerror = () => {
      alert("Error al procesar la imagen.");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  // Function to handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    processFileAsBase64(file, (base64) => {
      setData({ ...data, header: { ...data.header, logoImage: base64 } });
    });
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    processFileAsBase64(file, (base64) => {
      setData({ ...data, hero: { ...data.hero, image: base64 } });
    });
  };

  const handleServiceUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    processFileAsBase64(file, (base64) => {
      const newServices = [...data.services];
      newServices[index].image = base64;
      setData({ ...data, services: newServices });
    });
  };

  const handleProjectUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    processFileAsBase64(file, (base64) => {
      const newProjects = [...data.projects];
      newProjects[index].image = base64;
      setData({ ...data, projects: newProjects });
    });
  };

  const handleProjectDetailUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    processFileAsBase64(file, (base64) => {
      const newProjects = [...data.projects];
      newProjects[index].details.detailImage = base64;
      setData({ ...data, projects: newProjects });
    });
  };

  useEffect(() => {
    fetch('/api/profile-v2/data')
      .then(res => res.json())
      .then(dbData => {
        const validatedLayout = (dbData.layout && Object.keys(dbData.layout).length > 0)
          ? dbData.layout
          : defaultTemplateContent.layout;

        setData({
          ...defaultTemplateContent,
          ...dbData,
          layout: validatedLayout
        });
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Error cargando base de datos:", err);
        setIsLoading(false);
      });

    // Cargar galerías para vinculación
    fetch('/api/projects')
      .then(res => res.json())
      .then(d => {
        if (d.projects) setUserGalleries(d.projects);
      })
      .catch(err => console.error("Error fetching galleries:", err));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/profile-v2/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        alert("¡Cambios guardados correctamente!");
      } else {
        alert("Hubo un error al guardar.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión al guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    setData((prev) => {
      if (!prev.layout) return prev;
      const activeItems = prev.layout[activeContainer as keyof typeof prev.layout] as string[];
      const overItems = prev.layout[overContainer as keyof typeof prev.layout] as string[];

      const activeIndex = activeItems.indexOf(activeId);
      const overIndex = overItems.indexOf(overId);

      let newIndex;
      if (overId in prev.layout) {
        newIndex = overItems.length + 1;
      } else {
        const isBelowLastItem = over && overIndex === overItems.length - 1;
        const modifier = isBelowLastItem ? 1 : 0;
        newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
      }

      return {
        ...prev,
        layout: {
          ...prev.layout,
          [activeContainer]: activeItems.filter((item) => item !== activeId),
          [overContainer]: [
            ...overItems.slice(0, newIndex),
            activeItems[activeIndex],
            ...overItems.slice(newIndex, overItems.length),
          ],
        },
      };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !data.layout) {
      setActiveId(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (activeContainer && overContainer && activeContainer === overContainer) {
      const activeItems = data.layout[activeContainer as keyof typeof data.layout] as string[];
      const activeIndex = activeItems.indexOf(activeId);
      const overIndex = activeItems.indexOf(overId);

      if (activeIndex !== overIndex) {
        setData((prev) => ({
          ...prev,
          layout: {
            ...prev.layout!,
            [activeContainer]: arrayMove(activeItems, activeIndex, overIndex),
          },
        }));
      }
    }

    setActiveId(null);
  };

  function findContainer(id: string) {
    if (!data.layout) return null;
    if (id in data.layout) return id;

    return Object.keys(data.layout).find((key) => {
      const column = data.layout?.[key as keyof typeof data.layout];
      return Array.isArray(column) && column.includes(id);
    });
  }

  const renderModule = (id: string) => {
    switch (id) {
      case 'username':
        return (
          <section className="bg-[#1A1A1A] p-6 rounded-xl border border-[#2A2A2A] shadow-md relative">
            <div className="flex items-center gap-3 mb-6 border-b border-[#2A2A2A] pb-4 pr-12">
              <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-gray-200 uppercase tracking-widest m-0">Username (URL Personalizada)</h3>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 bg-[#222] border border-[#333] rounded-xl p-4 shadow-sm focus-within:border-gray-500 transition-all">
                <span className="text-gray-500 font-medium text-base select-none">closerlens.com/u/</span>
                <input
                  type="text"
                  className="flex-1 bg-transparent border-0 p-0 text-white text-lg font-bold focus:ring-0 outline-none placeholder:text-gray-500"
                  value={data.username || ""}
                  onChange={(e) => setData({ ...data, username: e.target.value })}
                  placeholder="tu-nombre"
                />
              </div>
            </div>
          </section>
        );
      case 'colors':
        return (
          <section className="bg-[#1A1A1A] p-6 rounded-xl border border-[#2A2A2A] shadow-lg">
            <h3 className="text-sm font-black text-gray-200 uppercase tracking-[0.2em] border-b border-[#2A2A2A] pb-4 mb-6">Colores Globales</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {(() => {
                const currentColors = data.colors || defaultTemplateContent.colors;
                const colorItems = [
                  { key: 'primary', label: 'Color Principal (Acentos, Botones, Iconos)' },
                  { key: 'bgDark', label: 'Fondo Alternativo' },
                  { key: 'bgLight', label: 'Fondo Secundario' },
                  { key: 'bgWhite', label: 'Fondo Principal' },
                  { key: 'textDark', label: 'Texto Principal' },
                  { key: 'textGray', label: 'Texto Secundario' },
                  { key: 'textWhite', label: 'Texto Contraste' },
                  { key: "headerBorder", label: "Línea del Header" },
                ];

                return colorItems.map((colorConf) => (
                  <div key={colorConf.key} className="bg-[#1e1e1e] p-5 border border-[#333] rounded-2xl flex flex-col gap-4 shadow-sm group/color hover:border-[#444] transition-all">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-tight m-0 min-h-[24px]">
                      {colorConf.label}
                    </label>
                    <div className="flex items-center gap-3 bg-[#161616] border border-[#2a2a2a] rounded-xl p-2.5 transition-all focus-within:border-gray-500 shadow-inner">
                      <input
                        type="color"
                        className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0 p-0 flex-shrink-0 ring-1 ring-white/10 shadow-lg"
                        value={currentColors[colorConf.key as keyof typeof currentColors]}
                        onChange={(e) => setData({ ...data, colors: { ...currentColors, [colorConf.key]: e.target.value } })}
                      />
                      <input
                        type="text"
                        className="flex-1 min-w-0 bg-transparent border-0 focus:ring-0 p-0 text-sm font-bold text-white uppercase tracking-widest outline-none font-mono"
                        value={currentColors[colorConf.key as keyof typeof currentColors]}
                        onChange={(e) => setData({ ...data, colors: { ...currentColors, [colorConf.key]: e.target.value } })}
                      />
                    </div>
                  </div>
                ))
              })()}
            </div>
          </section>
        );
      case 'about':
        return (
          <section className="bg-[#1A1A1A] p-6 rounded-xl border border-[#2A2A2A] relative">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3 mb-5 pr-12">
              <h3 className="text-sm font-bold text-gray-200 uppercase tracking-widest m-0">Sección Sobre Mí (About)</h3>
              <label className="relative inline-flex items-center cursor-pointer scale-90 origin-right">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={data.about.visible !== false}
                  onChange={(e) => setData({ ...data, about: { ...data.about, visible: e.target.checked } })}
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#000]"></div>
                <span className="ml-2 text-[10px] font-bold text-gray-400 uppercase">{data.about.visible !== false ? 'Visible' : 'Oculto'}</span>
              </label>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Título</label>
                <input
                  type="text"
                  className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg p-3 text-base focus:ring-1 focus:ring-[#666] outline-none transition-shadow"
                  value={data.about.title}
                  onChange={(e) => setData({ ...data, about: { ...data.about, title: e.target.value } })}
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-semibold text-gray-300 m-0">Descripción Narrativa</label>
                  <span className={`text-xs font-medium ${data.about.description.length > 950 ? 'text-red-500' : 'text-gray-400'}`}>
                    {data.about.description.length}/1000
                  </span>
                </div>
                <textarea
                  className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg p-3 text-base h-40 focus:ring-1 focus:ring-[#666] outline-none transition-shadow resize-none"
                  placeholder="Escribe aquí la narrativa sobre ti (máximo 1000 caracteres)..."
                  maxLength={1000}
                  value={data.about.description}
                  onChange={(e) => setData({ ...data, about: { ...data.about, description: e.target.value } })}
                />
              </div>

              <div className="pt-2 border-t border-[#2A2A2A] mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Habilidades / Skills</h4>
                  <button
                    onClick={() => {
                      const newSkills = [...(data.about.skills || [])];
                      newSkills.push({ name: "Nueva Habilidad", percentage: 80 });
                      setData({ ...data, about: { ...data.about, skills: newSkills } });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-[10px] font-bold uppercase rounded-lg hover:bg-gray-200 transition-colors shadow-sm active:scale-95"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                    Añadir
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(data.about.skills || []).map((skill, sIdx) => (
                    <div key={sIdx} className="bg-[#222] p-3 border border-[#333] rounded-lg space-y-2 relative group/skill transition-all hover:border-gray-500">
                      <button
                        onClick={() => {
                          const newSkills = data.about.skills.filter((_, i) => i !== sIdx);
                          setData({ ...data, about: { ...data.about, skills: newSkills } });
                        }}
                        className="absolute top-1 right-1 p-1 text-red-500/40 hover:text-red-500 transition-colors opacity-0 group-hover/skill:opacity-100"
                        title="Eliminar Habilidad"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                      <input
                        type="text"
                        className="w-full bg-transparent border-none text-white text-xs p-0 focus:ring-0 outline-none font-bold uppercase tracking-tight"
                        value={skill.name}
                        onChange={(e) => {
                          const newSkills = [...data.about.skills];
                          newSkills[sIdx].name = e.target.value;
                          setData({ ...data, about: { ...data.about, skills: newSkills } });
                        }}
                        placeholder="HABILIDAD"
                      />
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          className="flex-1 accent-white h-1 cursor-pointer"
                          value={skill.percentage}
                          onChange={(e) => {
                            const newSkills = [...data.about.skills];
                            newSkills[sIdx].percentage = parseInt(e.target.value);
                            setData({ ...data, about: { ...data.about, skills: newSkills } });
                          }}
                        />
                        <span className="text-[10px] text-gray-400 font-mono w-8 text-right font-bold">{skill.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
                {(data.about.skills || []).length === 0 && (
                  <div className="text-center py-4 border border-dashed border-[#333] rounded-lg">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest italic">No has añadido habilidades</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 pt-2">
                <div className="bg-[#222] p-4 border border-[#333] rounded-lg">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Color Título</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                      value={data.about.titleColor || "#000000"}
                      onChange={(e) => setData({ ...data, about: { ...data.about, titleColor: e.target.value } })}
                    />
                    <input
                      type="text"
                      className="flex-1 bg-transparent border-[#444] border text-white rounded p-1 text-xs font-mono uppercase"
                      value={data.about.titleColor || ""}
                      placeholder="Por defecto"
                      onChange={(e) => setData({ ...data, about: { ...data.about, titleColor: e.target.value } })}
                    />
                  </div>
                </div>
                <div className="bg-[#222] p-4 border border-[#333] rounded-lg">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Color Descripción</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                      value={data.about.descriptionColor || "#000000"}
                      onChange={(e) => setData({ ...data, about: { ...data.about, descriptionColor: e.target.value } })}
                    />
                    <input
                      type="text"
                      className="flex-1 bg-transparent border-[#444] border text-white rounded p-1 text-xs font-mono uppercase"
                      value={data.about.descriptionColor || ""}
                      placeholder="Por defecto"
                      onChange={(e) => setData({ ...data, about: { ...data.about, descriptionColor: e.target.value } })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      case 'header':
        return (
          <section className="bg-[#1A1A1A] p-6 rounded-xl border border-[#2A2A2A] relative">
            <h3 className="text-sm font-bold text-gray-200 uppercase tracking-widest border-b border-[#2A2A2A] pb-3 mb-5 pr-12">Navegación (Header y Menú)</h3>
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">Nombre de Marca / Sitio (SEO)</label>
                  <input
                    type="text"
                    className="w-full bg-[#222] border-[#333] border text-white rounded-lg p-3 text-base focus:ring-2 focus:ring-[#888] outline-none transition-shadow"
                    value={data.businessName || ""}
                    onChange={(e) => setData({ ...data, businessName: e.target.value })}
                    placeholder="El nombre de tu empresa"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Este nombre aparecerá en la pestaña del navegador.</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">Texto del Logo</label>
                  <input
                    type="text"
                    className="w-full bg-[#222] border-[#333] border text-white rounded-lg p-3 text-base focus:ring-2 focus:ring-[#888] outline-none transition-shadow"
                    value={data.header.logoText}
                    onChange={(e) => setData({ ...data, header: { ...data.header, logoText: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">Configuración del Logotipo</label>
                  <button
                    onClick={() => setShowLogoModal(true)}
                    className="w-full border-[#333] border border-dashed text-gray-300 rounded-lg p-3 text-sm font-medium hover:bg-[#2A2A2A] hover:border-gray-500 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {data.header.logoImage ? "Editar Logotipo / Centrado" : "Subir y Centrar Logotipo"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2 p-4 bg-[#222] border border-[#333] rounded-xl">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Color de Navegación</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                      value={data.header.navColor || "#343434"}
                      onChange={(e) => setData({ ...data, header: { ...data.header, navColor: e.target.value } })}
                    />
                    <input
                      type="text"
                      className="flex-1 border-[#444] bg-[#1A1A1A] text-white border rounded p-1 text-xs font-mono uppercase"
                      value={data.header.navColor || ""}
                      placeholder="Por defecto"
                      onChange={(e) => setData({ ...data, header: { ...data.header, navColor: e.target.value } })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Color Hover de Navegación</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                      value={data.header.navHoverColor || "#000000"}
                      onChange={(e) => setData({ ...data, header: { ...data.header, navHoverColor: e.target.value } })}
                    />
                    <input
                      type="text"
                      className="flex-1 border-[#444] bg-[#1A1A1A] text-white border rounded p-1 text-xs font-mono uppercase"
                      value={data.header.navHoverColor || ""}
                      placeholder="Por defecto"
                      onChange={(e) => setData({ ...data, header: { ...data.header, navHoverColor: e.target.value } })}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#2A2A2A]">
                <label className="block text-sm font-semibold text-gray-200 mb-3">Enlaces de Navegación (Menú)</label>
                <div className="space-y-3">
                  {data.header.navigation.map((nav, idx) => (
                    <div key={idx} className="flex gap-3 items-end bg-[#222] p-3 border border-[#333] rounded-lg group relative">
                      <div className="flex-1">
                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Etiqueta (Texto)</label>
                        <input
                          type="text"
                          className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded p-2 text-sm focus:ring-1 focus:ring-[#666] outline-none font-medium"
                          value={nav.label}
                          onChange={(e) => {
                            const newNav = [...data.header.navigation];
                            newNav[idx].label = e.target.value;
                            setData({ ...data, header: { ...data.header, navigation: newNav } });
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Enlace (URL)</label>
                        <input
                          type="text"
                          className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded p-2 text-sm focus:ring-1 focus:ring-[#666] outline-none"
                          value={nav.url}
                          onChange={(e) => {
                            const newNav = [...data.header.navigation];
                            newNav[idx].url = e.target.value;
                            setData({ ...data, header: { ...data.header, navigation: newNav } });
                          }}
                        />
                      </div>
                      <div className="flex flex-col items-center justify-center h-full pb-0.5">
                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Visible</label>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={nav.visible !== false}
                            onChange={(e) => {
                              const newNav = [...data.header.navigation];
                              newNav[idx].visible = e.target.checked;
                              setData({ ...data, header: { ...data.header, navigation: newNav } });
                            }}
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"></div>
                        </label>
                      </div>

                    </div>
                  ))}

                </div>
              </div>

              <div className="pt-4 border-t border-[#2A2A2A]">
                <label className="block text-sm font-semibold text-gray-200 mb-3">Redes Sociales (Íconos)</label>

                <div className="flex gap-3 mb-5 p-4 bg-[#222] border border-dashed rounded-xl border-[#444] items-end">
                  <div className="flex-1">
                    <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-400 mb-1">Plataforma</label>
                    <select
                      id="social-platform-render"
                      className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-md p-2 text-sm focus:ring-1 focus:ring-[#666] outline-none"
                    >
                      <option value="fab fa-instagram">Instagram</option>
                      <option value="fab fa-linkedin-in">LinkedIn</option>
                      <option value="fab fa-youtube">YouTube</option>
                      <option value="fab fa-vimeo-v">Vimeo</option>
                      <option value="fas fa-globe">Sitio Web</option>
                      <option value="fab fa-facebook-f">Facebook</option>
                      <option value="fab fa-x-twitter">X / Twitter</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-400 mb-1">URL / Enlace</label>
                    <input
                      id="social-url-render"
                      type="text"
                      placeholder="https://..."
                      className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-md p-2 text-sm focus:ring-1 focus:ring-[#666] outline-none"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const platform = (document.getElementById('social-platform-render') as HTMLSelectElement).value;
                      const url = (document.getElementById('social-url-render') as HTMLInputElement).value;
                      if (url) {
                        setData({
                          ...data,
                          header: {
                            ...data.header,
                            socials: [...data.header.socials, { icon: platform, url }]
                          }
                        });
                        (document.getElementById('social-url-render') as HTMLInputElement).value = "";
                      }
                    }}
                    className="bg-[#333] text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-[#555] transition-colors"
                  >
                    Agregar
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.header.socials.map((social, idx) => (
                    <div
                      key={idx}
                      className="flex gap-2 items-center bg-[#222] p-3 border border-[#333] rounded-lg shadow-sm transition-all"
                    >
                      <div className="w-10 h-10 bg-white/10 flex items-center justify-center rounded-lg text-lg text-white border border-white/20 shrink-0 shadow-lg group-hover:bg-white/20 transition-all">
                        <i className={`${social.icon} drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          className="w-full border-0 focus:ring-0 p-0 text-sm text-gray-300 font-medium bg-transparent outline-none"
                          value={social.url}
                          placeholder="https://..."
                          onChange={(e) => {
                            const newSocials = [...data.header.socials];
                            newSocials[idx].url = e.target.value;
                            setData({ ...data, header: { ...data.header, socials: newSocials } });
                          }}
                        />
                      </div>
                      <button
                        onClick={() => {
                          const newSocials = data.header.socials.filter((_, i) => i !== idx);
                          setData({ ...data, header: { ...data.header, socials: newSocials } });
                        }}
                        className="p-1.5 rounded text-red-400 hover:text-red-500 hover:bg-red-900/30 transition-colors shrink-0"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      case 'hero':
        return (
          <section className="bg-[#1A1A1A] p-6 rounded-xl border border-[#2A2A2A] relative">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3 mb-5 pr-12">
              <h3 className="text-sm font-bold text-gray-200 uppercase tracking-widest m-0">Sección Principal (Hero)</h3>
              <label className="relative inline-flex items-center cursor-pointer scale-90 origin-right">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={data.hero.visible !== false}
                  onChange={(e) => setData({ ...data, hero: { ...data.hero, visible: e.target.checked } })}
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#000]"></div>
                <span className="ml-2 text-[10px] font-bold text-gray-400 uppercase">{data.hero.visible !== false ? 'Visible' : 'Oculto'}</span>
              </label>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Título Principal</label>
                <input
                  type="text"
                  className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg p-3 text-base focus:ring-1 focus:ring-[#666] outline-none transition-shadow"
                  value={data.hero.heading}
                  onChange={(e) => setData({ ...data, hero: { ...data.hero, heading: e.target.value } })}
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-semibold text-gray-300 m-0">Texto Narrativo (Cuerpo)</label>
                  <span className={`text-xs font-medium ${data.hero.description.length > 950 ? 'text-red-500' : 'text-gray-400'}`}>
                    {data.hero.description.length}/1000
                  </span>
                </div>
                <textarea
                  className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg p-3 text-base h-40 focus:ring-1 focus:ring-[#666] outline-none transition-shadow resize-none"
                  placeholder="Escribe aquí tu narrativa (máximo 1000 caracteres)..."
                  maxLength={1000}
                  value={data.hero.description}
                  onChange={(e) => setData({ ...data, hero: { ...data.hero, description: e.target.value } })}
                />
                <p className="text-[11px] text-gray-400 mt-1 italic leading-tight">Soporta Saltos de línea para mejor legibilidad.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
                <div className="bg-[#222] p-4 border border-[#333] rounded-lg">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Color Título</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0 flex-shrink-0"
                      value={data.hero.titleColor || "#000000"}
                      onChange={(e) => setData({ ...data, hero: { ...data.hero, titleColor: e.target.value } })}
                    />
                    <input
                      type="text"
                      className="flex-1 min-w-0 bg-[#1A1A1A] border-[#444] border text-white rounded-lg h-10 px-3 text-xs font-mono uppercase"
                      value={data.hero.titleColor || ""}
                      placeholder="Por defecto"
                      onChange={(e) => setData({ ...data, hero: { ...data.hero, titleColor: e.target.value } })}
                    />
                  </div>
                </div>
                <div className="bg-[#222] p-4 border border-[#333] rounded-lg">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Color Descripción</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0 flex-shrink-0"
                      value={data.hero.descriptionColor || "#000000"}
                      onChange={(e) => setData({ ...data, hero: { ...data.hero, descriptionColor: e.target.value } })}
                    />
                    <input
                      type="text"
                      className="flex-1 min-w-0 bg-[#1A1A1A] border-[#444] border text-white rounded-lg h-10 px-3 text-xs font-mono uppercase"
                      value={data.hero.descriptionColor || ""}
                      placeholder="Por defecto"
                      onChange={(e) => setData({ ...data, hero: { ...data.hero, descriptionColor: e.target.value } })}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#2A2A2A]">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Botón Call to Action</h4>
                  <label className="relative inline-flex items-center cursor-pointer scale-90 origin-right">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={data.cta?.buttonVisible !== false}
                      onChange={(e) => setData({ ...data, cta: { ...(data.cta || defaultTemplateContent.cta!), buttonVisible: e.target.checked } })}
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#000]"></div>
                    <span className="ml-2 text-[10px] font-bold text-gray-400 uppercase">{data.cta?.buttonVisible !== false ? 'Visible' : 'Oculto'}</span>
                  </label>
                </div>
                <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 transition-opacity ${data.cta?.buttonVisible === false ? 'opacity-30 pointer-events-none' : ''}`}>
                  <div className="bg-[#222] p-4 border border-[#333] rounded-xl flex flex-col justify-between">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Texto del Botón</label>
                    <input
                      type="text"
                      className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-gray-500 outline-none transition-all"
                      value={data.hero.buttonText}
                      onChange={(e) => setData({ ...data, hero: { ...data.hero, buttonText: e.target.value } })}
                      placeholder="Contáctanos"
                    />
                  </div>
                  <div className="bg-[#222] p-4 border border-[#333] rounded-xl flex flex-col justify-between">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Ventana de Reservas</label>
                    <select
                      className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-gray-500 outline-none transition-all cursor-pointer"
                      value={data.cta?.reservationWindow || ""}
                      onChange={(e) => setData({ ...data, cta: { ...(data.cta || defaultTemplateContent.cta!), reservationWindow: e.target.value } })}
                    >
                      <option value="1 Semana">1 Semana</option>
                      <option value="2 Semanas">2 Semanas</option>
                      <option value="4 Semanas">4 Semanas</option>
                      <option value="8 Semanas">8 Semanas</option>
                    </select>
                  </div>
                  <div className="bg-[#222] p-4 border border-[#333] rounded-xl flex flex-col justify-between">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Anticipación Mínima</label>
                    <div className="relative">
                      <input
                        type="number"
                        className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-gray-500 outline-none transition-all pr-12"
                        value={data.cta?.minAnticipationDays || 0}
                        onChange={(e) => setData({ ...data, cta: { ...(data.cta || defaultTemplateContent.cta!), minAnticipationDays: parseInt(e.target.value) || 0 } })}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500 uppercase">Días</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#2A2A2A] space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold text-gray-200 uppercase tracking-tight mb-0">Fondo de Pantalla Hero</label>
                  <button
                    onClick={() => setShowHeroModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-xs font-bold hover:bg-gray-200 transition-all shadow-sm active:scale-95"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Configurar Imagen Hero
                  </button>
                </div>

                {data.hero.image && (
                  <div className="relative h-24 rounded-lg overflow-hidden border border-[#2A2A2A] bg-[#222] group">
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url('${data.hero.image}')` }}
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-white font-bold uppercase tracking-widest">En uso</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      case 'services':
        return (
          <section className="bg-[#1A1A1A] p-6 rounded-xl border border-[#2A2A2A] shadow-md relative">
            <div className="border-b border-[#2A2A2A] pb-4 mb-6 space-y-4 pr-12">
              <div className="flex justify-between items-start">
                <h3 className="text-sm font-bold text-gray-200 uppercase tracking-widest m-0">Servicios / Características</h3>
                <div className="flex items-center gap-4">
                  <label className="relative inline-flex items-center cursor-pointer scale-90 origin-right">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={data.servicesConfig?.visible !== false}
                      onChange={(e) => setData({ ...data, servicesConfig: { ...(data.servicesConfig || { offsetLeft: 0, offsetTop: 0, widthAddition: 0 }), visible: e.target.checked } })}
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#000]"></div>
                    <span className="ml-2 text-[10px] font-bold text-gray-400 uppercase">{data.servicesConfig?.visible !== false ? 'Visible' : 'Oculto'}</span>
                  </label>
                  <button
                    onClick={() => {
                      const newServices = [...(data.services || [])];
                      newServices.push({
                        title: "Nuevo Servicio",
                        description: "Descripción del servicio...",
                        icon: "fas fa-star",
                        image: "",
                        imageWidth: 80,
                        imageOffsetTop: 0,
                        imageOffsetLeft: 0
                      });
                      setData({ ...data, services: newServices });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-[10px] font-bold uppercase rounded-lg hover:bg-gray-200 transition-colors shadow-sm"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                    Añadir
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Color Íconos/Títulos</label>
                  <input
                    type="color"
                    className="w-10 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
                    value={data.servicesConfig?.titleColor || "#ffffff"}
                    onChange={(e) => setData({ ...data, servicesConfig: { ...(data.servicesConfig || { offsetLeft: 0, offsetTop: 0, widthAddition: 0 }), titleColor: e.target.value } })}
                  />
                </div>

                <div className="flex-1 min-w-[200px]">
                  <p className="text-[10px] text-gray-400 mb-2 uppercase font-bold tracking-tight">Control de Ubicación de la Sección</p>
                  <div className="flex items-center gap-4 bg-[#222] p-2 rounded-lg border border-[#333]">
                    <div className="flex flex-col items-center flex-1">
                      <input
                        type="range"
                        min="-500"
                        max="500"
                        className="w-full h-1.5 bg-[#444] rounded-lg appearance-none cursor-pointer accent-white"
                        value={data.servicesConfig?.offsetLeft || 0}
                        onChange={(e) => setData({
                          ...data,
                          servicesConfig: {
                            ...(data.servicesConfig || { offsetLeft: 0, offsetTop: 0, widthAddition: 0 }),
                            offsetLeft: parseInt(e.target.value)
                          }
                        })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              {data.services?.map((service, idx) => (
                <div key={idx} className="bg-[#222] p-4 border border-[#333] rounded-lg space-y-3 relative group/item">
                  <button
                    onClick={() => {
                      const newServices = data.services.filter((_, i) => i !== idx);
                      setData({ ...data, services: newServices });
                    }}
                    className="absolute top-2 right-2 w-7 h-7 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center opacity-60 group-hover/item:opacity-100 transition-all z-10 hover:bg-red-500 hover:text-white shadow-sm"
                    title="Eliminar Servicio"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  <div className="flex flex-col gap-4 pr-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Título</label>
                        <input
                          type="text"
                          className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg p-2 text-sm focus:ring-1 focus:ring-[#666] outline-none font-medium"
                          value={service.title}
                          onChange={(e) => {
                            const newServices = [...data.services];
                            newServices[idx].title = e.target.value;
                            setData({ ...data, services: newServices });
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Ícono (FA Class)</label>
                        <input
                          type="text"
                          className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg p-2 text-sm focus:ring-1 focus:ring-[#666] outline-none"
                          value={service.icon}
                          onChange={(e) => {
                            const newServices = [...data.services];
                            newServices[idx].icon = e.target.value;
                            setData({ ...data, services: newServices });
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Imagen del Servicio (Opcional)</label>
                        <div className="flex gap-2 items-center">
                          {service.image && (
                            <div className="w-10 h-10 rounded bg-[#1A1A1A] border border-[#444] p-1 flex-shrink-0">
                              <img src={service.image} alt="" className="w-full h-full object-contain" />
                            </div>
                          )}
                          <label className="flex-1 cursor-pointer">
                            <div className="bg-[#1A1A1A] border-[#444] border rounded-lg h-10 px-3 hover:bg-[#2A2A2A] transition-colors flex items-center justify-center text-[10px] font-bold uppercase text-gray-400 gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                              {service.image ? 'Cambiar Imagen' : 'Subir Imagen'}
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => handleServiceUpload(e, idx)}
                            />
                          </label>
                          {service.image && (
                            <button
                              onClick={() => {
                                const newServices = [...data.services];
                                newServices[idx].image = "";
                                setData({ ...data, services: newServices });
                              }}
                              className="w-10 h-10 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors border border-red-500/20"
                              title="Quitar Imagen"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 bg-[#1A1A1A] p-3 rounded-lg border border-[#333]">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-[9px] font-bold text-gray-500 uppercase">Ancho</label>
                            <span className="text-[9px] font-mono text-gray-400">{service.imageWidth || 80}px</span>
                          </div>
                          <input
                            type="range"
                            min="20"
                            max="400"
                            className="w-full h-1.5 bg-[#333] rounded-lg appearance-none cursor-pointer accent-white"
                            value={service.imageWidth || 80}
                            onChange={(e) => {
                              const newServices = [...data.services];
                              newServices[idx].imageWidth = parseInt(e.target.value);
                              setData({ ...data, services: newServices });
                            }}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center">
                              <label className="text-[9px] font-bold text-gray-500 uppercase">Nudge Y</label>
                              <span className="text-[9px] font-mono text-gray-400">{service.imageOffsetTop || 0}px</span>
                            </div>
                            <input
                              type="range"
                              min="-100"
                              max="100"
                              className="w-full h-1.5 bg-[#333] rounded-lg appearance-none cursor-pointer accent-white"
                              value={service.imageOffsetTop || 0}
                              onChange={(e) => {
                                const newServices = [...data.services];
                                newServices[idx].imageOffsetTop = parseInt(e.target.value);
                                setData({ ...data, services: newServices });
                              }}
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center">
                              <label className="text-[9px] font-bold text-gray-500 uppercase">Nudge X</label>
                              <span className="text-[9px] font-mono text-gray-400">{service.imageOffsetLeft || 0}px</span>
                            </div>
                            <input
                              type="range"
                              min="-100"
                              max="100"
                              className="w-full h-1.5 bg-[#333] rounded-lg appearance-none cursor-pointer accent-white"
                              value={service.imageOffsetLeft || 0}
                              onChange={(e) => {
                                const newServices = [...data.services];
                                newServices[idx].imageOffsetLeft = parseInt(e.target.value);
                                setData({ ...data, services: newServices });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Descripción</label>
                      <textarea
                        className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg p-2 text-sm h-20 focus:ring-1 focus:ring-[#666] outline-none resize-none"
                        value={service.description}
                        onChange={(e) => {
                          const newServices = [...data.services];
                          newServices[idx].description = e.target.value;
                          setData({ ...data, services: newServices });
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      case 'experience':
        return (
          <section className="bg-[#1A1A1A] p-6 rounded-xl border border-[#2A2A2A] relative">
            <div className="flex flex-col gap-4 border-b border-[#2A2A2A] pb-5 mb-5 pr-12">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-200 uppercase tracking-widest m-0">{data.experienceTitle}</h3>
                <div className="flex items-center gap-4">
                  <label className="relative inline-flex items-center cursor-pointer scale-90 origin-right">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={data.experienceVisible !== false}
                      onChange={(e) => setData({ ...data, experienceVisible: e.target.checked })}
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#000]"></div>
                    <span className="ml-2 text-[10px] font-bold text-gray-400 uppercase">{data.experienceVisible !== false ? 'Visible' : 'Oculto'}</span>
                  </label>
                  <button
                    onClick={() => {
                      const newExp = [...(data.experience || [])];
                      newExp.push({
                        years: "2020-Presente",
                        company: "Nueva Empresa",
                        role: "Nuevo Rol",
                        description: "Descripción de responsabilidades..."
                      });
                      setData({ ...data, experience: newExp });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-[10px] font-bold uppercase rounded-lg hover:bg-gray-200 transition-colors shadow-sm"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                    Añadir
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Título de la Sección</label>
                  <input
                    type="text"
                    className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg p-2 text-sm focus:ring-1 focus:ring-[#666] outline-none"
                    value={data.experienceTitle}
                    onChange={(e) => setData({ ...data, experienceTitle: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Color del Título de Sección</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                        value={data.experienceTitleColor || "#ffffff"}
                        onChange={(e) => setData({ ...data, experienceTitleColor: e.target.value })}
                      />
                      <input
                        type="text"
                        className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg p-2 text-sm uppercase font-mono focus:ring-1 focus:ring-[#666] outline-none"
                        value={data.experienceTitleColor || ""}
                        onChange={(e) => setData({ ...data, experienceTitleColor: e.target.value })}
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 truncate">Color: Puesto</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0 flex-shrink-0"
                      value={data.experienceItemRoleColor || "#ffffff"}
                      onChange={(e) => setData({ ...data, experienceItemRoleColor: e.target.value })}
                    />
                    <input
                      type="text"
                      className="flex-1 min-w-0 bg-[#1A1A1A] border-[#444] text-white border rounded-lg h-10 px-3 text-xs uppercase font-mono"
                      value={data.experienceItemRoleColor || ""}
                      onChange={(e) => setData({ ...data, experienceItemRoleColor: e.target.value })}
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 truncate">Color: Empresa</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0 flex-shrink-0"
                      value={data.experienceItemCompanyColor || "#ffffff"}
                      onChange={(e) => setData({ ...data, experienceItemCompanyColor: e.target.value })}
                    />
                    <input
                      type="text"
                      className="flex-1 min-w-0 bg-[#1A1A1A] border-[#444] text-white border rounded-lg h-10 px-3 text-xs uppercase font-mono"
                      value={data.experienceItemCompanyColor || ""}
                      onChange={(e) => setData({ ...data, experienceItemCompanyColor: e.target.value })}
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 truncate">Color: Periodo</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0 flex-shrink-0"
                      value={data.experienceItemPeriodColor || "#ffffff"}
                      onChange={(e) => setData({ ...data, experienceItemPeriodColor: e.target.value })}
                    />
                    <input
                      type="text"
                      className="flex-1 min-w-0 bg-[#1A1A1A] border-[#444] text-white border rounded-lg h-10 px-3 text-xs uppercase font-mono"
                      value={data.experienceItemPeriodColor || ""}
                      onChange={(e) => setData({ ...data, experienceItemPeriodColor: e.target.value })}
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 truncate">Color: Desc</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0 flex-shrink-0"
                      value={data.experienceItemDescriptionColor || "#ffffff"}
                      onChange={(e) => setData({ ...data, experienceItemDescriptionColor: e.target.value })}
                    />
                    <input
                      type="text"
                      className="flex-1 min-w-0 bg-[#1A1A1A] border-[#444] text-white border rounded-lg h-10 px-3 text-xs uppercase font-mono"
                      value={data.experienceItemDescriptionColor || ""}
                      onChange={(e) => setData({ ...data, experienceItemDescriptionColor: e.target.value })}
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              {data.experience?.map((exp, idx) => (
                <div key={idx} className="bg-[#222] p-4 border border-[#333] rounded-lg space-y-4 relative group/item">
                  <button
                    onClick={() => {
                      const newExp = [...data.experience];
                      newExp.splice(idx, 1);
                      setData({ ...data, experience: newExp });
                    }}
                    className="absolute top-2 right-2 w-7 h-7 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center opacity-60 group-hover/item:opacity-100 transition-all z-10 hover:bg-red-500 hover:text-white shadow-sm"
                    title="Eliminar Experiencia"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  <div className="grid grid-cols-2 gap-4 pr-8">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Puesto</label>
                      <input
                        type="text"
                        className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg p-2 text-sm"
                        value={exp.role}
                        onChange={(e) => {
                          const newExp = [...data.experience];
                          newExp[idx].role = e.target.value;
                          setData({ ...data, experience: newExp });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Empresa</label>
                      <input
                        type="text"
                        className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg p-2 text-sm"
                        value={exp.company}
                        onChange={(e) => {
                          const newExp = [...data.experience];
                          newExp[idx].company = e.target.value;
                          setData({ ...data, experience: newExp });
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Periodo</label>
                      <input
                        type="text"
                        className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg p-2 text-sm"
                        value={exp.years}
                        onChange={(e) => {
                          const newExp = [...data.experience];
                          newExp[idx].years = e.target.value;
                          setData({ ...data, experience: newExp });
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Descripción</label>
                    <textarea
                      className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg p-2 text-sm h-20 resize-none outline-none focus:ring-1 focus:ring-[#666]"
                      value={exp.description}
                      onChange={(e) => {
                        const newExp = [...data.experience];
                        newExp[idx].description = e.target.value;
                        setData({ ...data, experience: newExp });
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      case 'projects':
        return (
          <section className="bg-[#1A1A1A] p-6 rounded-xl border border-[#2A2A2A] shadow-md relative">
            <div className="flex flex-col gap-4 border-b border-[#2A2A2A] pb-5 mb-5 pr-12">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-200 uppercase tracking-widest m-0">{data.projectsTitle}</h3>
                <div className="flex items-center gap-4">
                  <label className="relative inline-flex items-center cursor-pointer scale-90 origin-right">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={data.projectsVisible !== false}
                      onChange={(e) => setData({ ...data, projectsVisible: e.target.checked })}
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#000]"></div>
                    <span className="ml-2 text-[10px] font-bold text-gray-400 uppercase">{data.projectsVisible !== false ? 'Visible' : 'Oculto'}</span>
                  </label>
                  <button
                    onClick={() => {
                      const newProjects = [...(data.projects || [])];
                      const nextId = newProjects.length + 1;
                      newProjects.push({
                        id: `project-${nextId}`,
                        title: "Nuevo Proyecto",
                        category: "",
                        image: "/labs/img/portfolio/1140x641-1.jpg",
                        externalLink: "",
                        galleryId: "",
                        gallerySlug: "",
                        showAsCollage: false,
                        details: { clients: "", completion: "", role: "", authors: "", detailImage: "" }
                      });
                      setData({ ...data, projects: newProjects });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-[10px] font-bold uppercase rounded-lg hover:bg-gray-200 transition-colors shadow-sm"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                    Añadir
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Título de la Sección</label>
                  <input
                    type="text"
                    className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg p-2 text-sm"
                    value={data.projectsTitle}
                    onChange={(e) => setData({ ...data, projectsTitle: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Color del Título de Sección</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0 flex-shrink-0"
                        value={data.projectsTitleColor || "#ffffff"}
                        onChange={(e) => setData({ ...data, projectsTitleColor: e.target.value })}
                      />
                      <input
                        type="text"
                        className="flex-1 min-w-0 bg-[#1A1A1A] border-[#444] text-white border rounded-lg h-10 px-3 text-sm uppercase font-mono"
                        value={data.projectsTitleColor || ""}
                        onChange={(e) => setData({ ...data, projectsTitleColor: e.target.value })}
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Color del Elemento: Título de Proyecto</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0 flex-shrink-0"
                      value={data.projectsItemTitleColor || "#ffffff"}
                      onChange={(e) => setData({ ...data, projectsItemTitleColor: e.target.value })}
                    />
                    <input
                      type="text"
                      className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg h-10 px-3 text-sm uppercase font-mono"
                      value={data.projectsItemTitleColor || ""}
                      onChange={(e) => setData({ ...data, projectsItemTitleColor: e.target.value })}
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Color del Elemento: Tipo de Proyecto</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0 flex-shrink-0"
                      value={data.projectsItemCategoryColor || "#ffffff"}
                      onChange={(e) => setData({ ...data, projectsItemCategoryColor: e.target.value })}
                    />
                    <input
                      type="text"
                      className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg h-10 px-3 text-sm uppercase font-mono"
                      value={data.projectsItemCategoryColor || ""}
                      onChange={(e) => setData({ ...data, projectsItemCategoryColor: e.target.value })}
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              {data.projects?.map((project, idx) => (
                <div key={idx} className="bg-[#222] p-4 border border-[#333] rounded-lg space-y-3 relative group/item">
                  <button
                    onClick={() => {
                      const newProjects = data.projects.filter((_, i) => i !== idx);
                      setData({ ...data, projects: newProjects });
                    }}
                    className="absolute top-2 right-2 w-7 h-7 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center opacity-60 group-hover/item:opacity-100 transition-all z-10 hover:bg-red-500 hover:text-white shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  <div className="grid grid-cols-2 gap-4 pr-8">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Título</label>
                      <input
                        type="text"
                        className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg p-2 text-sm"
                        value={project.title}
                        onChange={(e) => {
                          const newProjects = [...data.projects];
                          newProjects[idx].title = e.target.value;
                          setData({ ...data, projects: newProjects });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Tipo de proyecto...</label>
                      <input
                        type="text"
                        className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg p-2 text-sm"
                        value={project.category || ''}
                        onChange={(e) => {
                          const newProjects = [...data.projects];
                          newProjects[idx].category = e.target.value;
                          setData({ ...data, projects: newProjects });
                        }}
                        placeholder="Ej: Ilustración, Branding..."
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pr-8">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">URL de Imagen de Portada</label>
                      <input
                        type="text"
                        className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg p-2 text-sm font-mono"
                        value={project.image || ''}
                        onChange={(e) => {
                          const newProjects = [...data.projects];
                          newProjects[idx].image = e.target.value;
                          setData({ ...data, projects: newProjects });
                        }}
                        placeholder="https://..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Vincular Galería Interna</label>
                        <select
                          className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-[#666]"
                          value={project.galleryId || ""}
                          onChange={(e) => {
                            const newProjects = [...data.projects];
                            const selectedId = e.target.value;
                            newProjects[idx].galleryId = selectedId;
                            if (selectedId) {
                              const match = userGalleries.find((g: any) => g.id === selectedId);
                              newProjects[idx].gallerySlug = match?.slug || "";
                            } else {
                              newProjects[idx].gallerySlug = "";
                            }
                            setData({ ...data, projects: newProjects });
                          }}
                        >
                          <option value="">-- Sin vincular --</option>
                          {userGalleries.map((g: any) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                        {project.galleryId && (
                          <div className="flex items-center mt-2 animate-in fade-in slide-in-from-top-1 duration-300">
                            <label className="relative inline-flex items-center cursor-pointer scale-75 origin-left">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={!!project.showAsCollage}
                                onChange={(e) => {
                                  const newProjects = [...data.projects];
                                  newProjects[idx].showAsCollage = e.target.checked;
                                  setData({ ...data, projects: newProjects });
                                }}
                              />
                              <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                              <span className="ml-2 text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">Modo Collage (3 Fotos)</span>
                            </label>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">O usar Enlace Externo</label>
                        <input
                          type="text"
                          className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg p-2 text-sm font-mono"
                          value={project.externalLink || ''}
                          onChange={(e) => {
                            const newProjects = [...data.projects];
                            newProjects[idx].externalLink = e.target.value;
                            setData({ ...data, projects: newProjects });
                          }}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      case 'testimonials':
        return (
          <section className="bg-[#1A1A1A] p-6 rounded-xl border border-[#2A2A2A] shadow-md relative">
            <div className="flex flex-col gap-4 border-b border-[#2A2A2A] pb-5 mb-5 pr-12">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-200 uppercase tracking-widest m-0">Testimonios</h3>
                <div className="flex items-center gap-4">
                  <label className="relative inline-flex items-center cursor-pointer scale-90 origin-right">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={data.testimonialsVisible !== false}
                      onChange={(e) => setData({ ...data, testimonialsVisible: e.target.checked })}
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#000]"></div>
                    <span className="ml-2 text-[10px] font-bold text-gray-400 uppercase">{data.testimonialsVisible !== false ? 'Visible' : 'Oculto'}</span>
                  </label>
                  <button
                    onClick={() => {
                      const newTesti = [...(data.testimonials || [])];
                      newTesti.push({
                        quote: "Excelente trabajo, altamente recomendado.",
                        author: "Nombre del Cliente",
                        role: "Cargo / Empresa"
                      });
                      setData({ ...data, testimonials: newTesti });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-[10px] font-bold uppercase rounded-lg hover:bg-gray-200 transition-colors shadow-sm"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                    Añadir
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#222] p-3 border border-[#333] rounded-lg">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Título de la Sección</label>
                  <input
                    type="text"
                    className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg p-2 text-sm focus:ring-1 focus:ring-[#666] outline-none"
                    value={data.testimonialsTitle}
                    onChange={(e) => setData({ ...data, testimonialsTitle: e.target.value })}
                    placeholder="Ej: Qué dicen nuestros clientes"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Color del Título</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                      value={data.testimonialsTitleColor || "#343434"}
                      onChange={(e) => setData({ ...data, testimonialsTitleColor: e.target.value })}
                    />
                    <input
                      type="text"
                      className="flex-1 bg-transparent border-[#444] border text-white rounded p-1 text-xs font-mono uppercase"
                      value={data.testimonialsTitleColor || ""}
                      placeholder="Por defecto"
                      onChange={(e) => setData({ ...data, testimonialsTitleColor: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              {data.testimonials?.map((testi, idx) => (
                <div key={idx} className="bg-[#222] p-4 border border-[#333] rounded-lg space-y-3 relative group/item">
                  <button
                    onClick={() => {
                      const newTesti = data.testimonials.filter((_, i) => i !== idx);
                      setData({ ...data, testimonials: newTesti });
                    }}
                    className="absolute top-2 right-2 w-7 h-7 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center opacity-60 group-hover/item:opacity-100 transition-all z-10 hover:bg-red-500 hover:text-white shadow-sm"
                    title="Eliminar Testimonio"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  <div className="pr-8">
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Cita / Comentario</label>
                    <textarea
                      className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg p-2 text-sm h-20 focus:ring-1 focus:ring-[#666] outline-none"
                      value={testi.quote}
                      onChange={(e) => {
                        const newTesti = [...data.testimonials];
                        newTesti[idx].quote = e.target.value;
                        setData({ ...data, testimonials: newTesti });
                      }}
                    />
                  </div>
                  <div className="flex gap-4 pr-8">
                    <div className="w-1/2">
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Autor</label>
                      <input
                        type="text"
                        className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg p-2 text-sm focus:ring-1 focus:ring-[#666] outline-none"
                        value={testi.author}
                        onChange={(e) => {
                          const newTesti = [...data.testimonials];
                          newTesti[idx].author = e.target.value;
                          setData({ ...data, testimonials: newTesti });
                        }}
                      />
                    </div>
                    <div className="w-1/2">
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Cargo / Empresa</label>
                      <input
                        type="text"
                        className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg p-2 text-sm focus:ring-1 focus:ring-[#666] outline-none"
                        value={testi.role}
                        onChange={(e) => {
                          const newTesti = [...data.testimonials];
                          newTesti[idx].role = e.target.value;
                          setData({ ...data, testimonials: newTesti });
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      case 'footer':
        return (
          <section className="bg-[#1A1A1A] p-6 rounded-xl border border-[#2A2A2A] shadow-md relative">
            <h3 className="text-sm font-bold text-gray-200 uppercase tracking-widest border-b border-[#2A2A2A] pb-3 mb-5 pr-12">Configuración del Footer</h3>
            <div className="bg-[#222] p-4 border border-[#333] rounded-lg space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg p-2 text-sm focus:ring-1 focus:ring-[#666] outline-none"
                    value={data.footer?.email}
                    onChange={(e) => setData({ ...data, footer: { ...data.footer, email: e.target.value } })}
                    placeholder="ejemplo@correo.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Etiqueta Redes Sociales</label>
                  <input
                    type="text"
                    className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg p-2 text-sm focus:ring-1 focus:ring-[#666] outline-none"
                    value={data.footer?.socialLabel}
                    onChange={(e) => setData({ ...data, footer: { ...data.footer, socialLabel: e.target.value } })}
                    placeholder="Ej: Sígueme en:"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Texto de Copyright</label>
                <input
                  type="text"
                  className="w-full bg-[#1A1A1A] border-[#444] text-white border rounded-lg p-2 text-sm focus:ring-1 focus:ring-[#666] outline-none"
                  value={data.footer?.copyrightText}
                  onChange={(e) => setData({ ...data, footer: { ...data.footer, copyrightText: e.target.value } })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[#333] pt-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Color Email</label>
                  <input
                    type="color"
                    className="w-full h-8 rounded cursor-pointer border-[#444] border p-1 bg-[#1A1A1A]"
                    value={data.footer?.emailColor || "#ffffff"}
                    onChange={(e) => setData({ ...data, footer: { ...data.footer, emailColor: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Color Social</label>
                  <input
                    type="color"
                    className="w-full h-8 rounded cursor-pointer border-[#444] border p-1 bg-[#1A1A1A]"
                    value={data.footer?.socialLabelColor || "#ffffff"}
                    onChange={(e) => setData({ ...data, footer: { ...data.footer, socialLabelColor: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Color Copyright</label>
                  <input
                    type="color"
                    className="w-full h-8 rounded cursor-pointer border-[#444] border p-1 bg-[#1A1A1A]"
                    value={data.footer?.copyrightColor || "#343434"}
                    onChange={(e) => setData({ ...data, footer: { ...data.footer, copyrightColor: e.target.value } })}
                  />
                </div>
              </div>
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="-m-4 md:-m-8 lg:-m-12 flex h-[calc(100vh-3.5rem)] md:h-screen items-center justify-center bg-[#121212] transition-colors duration-300">
        <p className="text-gray-400 font-medium animate-pulse">Cargando constructor...</p>
      </div>
    );
  }

  return (
    <div className="-m-4 md:-m-8 lg:-m-12 flex h-[calc(100vh-3.5rem)] md:h-screen overflow-hidden bg-[#121212] flex-col font-sans text-gray-200">
      {/* Font Awesome para iconos de redes sociales */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" />

      {/* Botones fijos en la esquina superior derecha */}
      <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer', backgroundColor: isSaving ? '#444' : '#ffffff', color: isSaving ? '#888' : '#000000', transition: 'background-color 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
          onClick={handleSave}
          disabled={isSaving}
          onMouseEnter={(e) => { if (!isSaving) (e.currentTarget.style.backgroundColor = '#e0e0e0'); }}
          onMouseLeave={(e) => { if (!isSaving) (e.currentTarget.style.backgroundColor = '#ffffff'); }}
        >
          {isSaving ? "Guardando..." : "Guardar Proyecto"}
        </button>
        <a
          href={data.username ? `/u/${data.username}` : '#'}
          target="_blank"
          rel="noopener noreferrer"
          style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, border: '1px solid #444', backgroundColor: '#1A1A1A', color: '#ccc', textDecoration: 'none', textAlign: 'center', cursor: 'pointer', transition: 'background-color 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#222'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1A1A1A'; }}
        >
          <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          Ver Perfil
        </a>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <main className="w-full h-full bg-[#121212] overflow-y-auto custom-scrollbar">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

            {/* ENTERPRISE HEADER */}
            <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight text-center lg:text-left">Diseño de Perfil</h1>
                <p className="text-sm text-gray-400 mt-2 max-w-2xl text-center lg:text-left">
                  Configura la identidad visual, el contenido y la estructura de tu escaparate público en <strong className="text-gray-200">Closerlens</strong>.
                </p>
              </div>
            </div>

            {/* 3-COLUMN GRID LAYOUT (MASONRY-LIKE LOGICAL SPLIT) */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
                {Object.keys(data.layout || defaultTemplateContent.layout || {}).map((columnKey) => {
                  const currentLayout = data.layout || defaultTemplateContent.layout || { column1: [], column2: [], column3: [] };
                  const columnItems = currentLayout[columnKey as keyof typeof currentLayout] || [];
                  return (
                    <div key={columnKey} className="flex flex-col gap-8">
                      <SortableContext
                        items={columnItems}
                        strategy={verticalListSortingStrategy}
                      >
                        {columnItems.map((itemId: string) => (
                          <SortableItem key={itemId} id={itemId}>
                            {renderModule(itemId)}
                          </SortableItem>
                        ))}
                      </SortableContext>
                    </div>
                  );
                })}
              </div>

              <DragOverlay dropAnimation={{
                sideEffects: defaultDropAnimationSideEffects({
                  styles: {
                    active: {
                      opacity: "0.5",
                    },
                  },
                }),
              }}>
                {activeId ? (
                  <div className="opacity-80 scale-105 transition-transform">
                    {renderModule(activeId)}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </main>


        {/* MODAL CONFIGURACIÓN LOGOTIPO */}
        {
          showLogoModal && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-[#121212] rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-[#2A2A2A] animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between bg-[#1A1A1A]">
                  <h3 className="text-xl font-bold text-white">Configuración de Logotipo</h3>
                  <button
                    onClick={() => setShowLogoModal(false)}
                    className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-[#333] transition-all"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-8 space-y-8">
                  <div className="space-y-4">
                    <label className="block text-sm font-bold text-gray-200 uppercase tracking-tight">Subir Logotipo</label>
                    <label
                      className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer hover:border-gray-500 hover:bg-[#1A1A1A] transition-all group ${isDraggingHero ? 'border-primary bg-primary/5' : 'border-[#444]'}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingHero(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setIsDraggingHero(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingHero(false);
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          const fakeEvent = {
                            target: { files: e.dataTransfer.files }
                          } as unknown as React.ChangeEvent<HTMLInputElement>;
                          handleFileUpload(fakeEvent);
                        }
                      }}
                    >
                      <div className="flex flex-col items-center justify-center text-gray-400 group-hover:text-gray-300 transition-colors pointer-events-none">
                        <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        <span className="text-xs font-bold">{isUploading ? "Subiendo..." : "Haz clic o arrastra para subir una imagen"}</span>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        disabled={isUploading}
                        onChange={handleFileUpload}
                      />
                    </label>

                    <div className="relative flex items-center justify-center">
                      <div className="border-t border-[#333] w-full"></div>
                      <span className="absolute bg-[#121212] px-3 text-xs font-bold text-gray-400 uppercase">o</span>
                    </div>

                    <label className="block text-sm font-bold text-gray-200 uppercase tracking-tight">URL del Logotipo</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-white text-gray-400">
                        <svg className="w-5 h-5 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                      <input
                        type="text"
                        className="block w-full pl-12 pr-4 py-4 bg-[#1A1A1A] border-2 border-[#333] rounded-xl text-white text-sm focus:ring-0 focus:border-gray-500 focus:bg-[#222] transition-all outline-none font-medium shadow-inner"
                        placeholder="https://tu-sitio.com/logo.png"
                        value={data.header.logoImage || ""}
                        onChange={(e) => setData({ ...data, header: { ...data.header, logoImage: e.target.value } })}
                      />
                    </div>
                  </div>

                  {/* Live Preview & Centering Area */}
                  <div className="space-y-4">
                    <label className="block text-sm font-bold text-gray-200 mb-2 uppercase tracking-tight">Vista Previa (Alineación de orilla a orilla)</label>
                    <div className="relative h-48 bg-[#1E1E1E] rounded-xl overflow-hidden border-2 border-dashed border-[#444] flex items-start justify-center bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-repeat">
                      <div className="absolute top-0 bottom-0 left-0 right-0 border-x border-[#333] bg-[#121212]/30 z-0"></div>
                      <div className="absolute top-12 left-0 right-0 h-[2px] bg-[#444] z-0"></div>

                      {data.header.logoImage ? (
                        <div
                          className="absolute top-0 z-10 transition-all duration-300"
                          style={{
                            left: `${data.header.logoCenter || 0}%`,
                            transform: 'translateX(-50%)',
                            width: `${data.header.logoWidth || 120}px`
                          }}
                        >
                          <img src={data.header.logoImage} alt="Logo Preview" className="w-full h-auto object-contain" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-sm font-medium italic px-10 text-center">
                          Inserta una URL arriba para previsualizar el logo aquí
                        </div>
                      )}
                    </div>

                    <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ancho del Logo (px)</label>
                          <span className="text-xs font-mono font-bold text-white bg-[#333] px-2 py-1 rounded">{data.header.logoWidth || 120}px</span>
                        </div>
                        <input
                          type="range"
                          min="60"
                          max="300"
                          className="w-full h-1.5 bg-[#444] rounded-lg appearance-none cursor-pointer accent-white"
                          value={data.header.logoWidth || 120}
                          onChange={(e) => setData({ ...data, header: { ...data.header, logoWidth: parseInt(e.target.value) } })}
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Alineación (Izquierda - Derecha)</label>
                          <span className="text-xs font-mono font-bold text-white bg-[#333] px-2 py-1 rounded">{data.header.logoCenter || 50}%</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="95"
                          step="1"
                          className="w-full h-1.5 bg-[#444] rounded-lg appearance-none cursor-pointer accent-white"
                          value={data.header.logoCenter || 50}
                          onChange={(e) => setData({ ...data, header: { ...data.header, logoCenter: parseInt(e.target.value) } })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-[#1A1A1A] border-t border-[#333] flex justify-end">
                    <button
                      onClick={() => {
                        setShowLogoModal(false);
                        handleSave();
                      }}
                      className="bg-white text-black px-10 py-4 rounded-xl font-bold shadow-lg hover:shadow-white/20 hover:scale-[1.02] active:scale-95 transition-all text-base"
                    >
                      Listo, Aplicar y Subir
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        }

        {/* MODAL CONFIGURACIÓN HERO IMAGE */}
        {
          showHeroModal && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-[#121212] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-[#2A2A2A] animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between bg-[#1A1A1A]">
                  <h3 className="text-xl font-bold text-white">Configuración de Imagen Hero</h3>
                  <button
                    onClick={() => setShowHeroModal(false)}
                    className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-[#333] transition-all"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-8 space-y-6 overflow-y-auto max-h-[80vh]">
                  <div className="space-y-4">
                    <label className="block text-sm font-bold text-gray-200 uppercase tracking-tight">Imagen de Fondo (1920x1080)</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative group">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleHeroUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div
                          className={`w-full py-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 group-hover:border-gray-500 group-hover:bg-[#1A1A1A] transition-all ${isDraggingHero ? 'border-primary bg-primary/5' : 'border-[#444] bg-[#222]'}`}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingHero(true);
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            setIsDraggingHero(false);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingHero(false);
                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                              const fakeEvent = {
                                target: { files: e.dataTransfer.files }
                              } as unknown as React.ChangeEvent<HTMLInputElement>;
                              handleHeroUpload(fakeEvent);
                            }
                          }}
                        >
                          {isUploading ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                              <span className="text-xs font-bold text-black">Subiendo...</span>
                            </div>
                          ) : (
                            <>
                              <svg className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                              <span className="text-xs font-bold text-gray-500 group-hover:text-white transition-colors">Haz clic o arrastra para subir</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="relative group">
                        <input
                          type="text"
                          className="block w-full pl-4 pr-4 py-4 bg-[#1A1A1A] border-2 border-[#333] rounded-xl text-white text-sm focus:ring-0 focus:border-gray-500 focus:bg-[#222] transition-all outline-none font-medium shadow-inner h-full"
                          placeholder="O pega una URL aquí..."
                          value={data.hero.image || ""}
                          onChange={(e) => setData({ ...data, hero: { ...data.hero, image: e.target.value } })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Viewport Preview */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-bold text-gray-200 m-0 uppercase tracking-tight">Vista Previa y Encuadre</label>
                      <div className="flex items-center gap-1 bg-[#222] border border-[#333] p-0.5 rounded-lg">
                        <button
                          onClick={() => setHeroDragMode('image')}
                          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${heroDragMode === 'image' ? 'bg-[#333] text-white shadow-sm' : 'text-gray-400 hover:text-gray-300'}`}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /></svg>
                          Mover Imagen
                        </button>
                        <button
                          onClick={() => setHeroDragMode('viewport')}
                          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${heroDragMode === 'viewport' ? 'bg-[#333] text-white shadow-sm' : 'text-gray-400 hover:text-gray-300'}`}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                          Mover Ventana
                        </button>
                      </div>
                    </div>

                    {/* MODE: Mover Imagen */}
                    {heroDragMode === 'image' && (
                      <div
                        className={`relative h-64 bg-[#121212] rounded-xl overflow-hidden border-2 flex items-center justify-center transition-all cursor-move select-none ${isDraggingHero ? 'border-primary ring-4 ring-primary/10' : 'border-[#444] shadow-inner'}`}
                        onMouseDown={(e) => {
                          setIsDraggingHero(true);
                          setDragStart({
                            x: e.clientX,
                            y: e.clientY,
                            posX: data.hero.imagePositionX ?? 50,
                            posY: data.hero.imagePositionY ?? 50
                          });
                        }}
                        onMouseMove={(e) => {
                          if (!isDraggingHero) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
                          const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;
                          const newX = Math.max(0, Math.min(100, dragStart.posX - deltaX));
                          const newY = Math.max(0, Math.min(100, dragStart.posY - deltaY));
                          setData({ ...data, hero: { ...data.hero, imagePositionX: Math.round(newX), imagePositionY: Math.round(newY) } });
                        }}
                        onMouseUp={() => setIsDraggingHero(false)}
                        onMouseLeave={() => setIsDraggingHero(false)}
                      >
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            backgroundImage: `url('${data.hero.image || "/img/bg/personal.jpg"}')`,
                            backgroundPosition: `${data.hero.imagePositionX ?? 50}% ${data.hero.imagePositionY ?? 50}%`,
                            backgroundSize: data.hero.imageScale ? `${data.hero.imageScale}%` : 'cover',
                            backgroundRepeat: 'no-repeat',
                            filter: `brightness(${data.hero.imageBrightness ?? 1.0}) blur(${data.hero.imageBlur ?? 0}px)`
                          }}
                        />
                        <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none flex items-center justify-center">
                          <div className="w-full h-full border border-white/50 relative">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-full h-[1px] bg-white/20" />
                              <div className="h-full w-[1px] bg-white/20 absolute" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* MODE: Mover Ventana */}
                    {heroDragMode === 'viewport' && (() => {
                      // Model how CSS background-size and background-position work
                      // Container = hero section at 1920×1080 (Full HD)
                      const containerW = 1920;
                      const containerH = 1080;
                      const imgW = heroImageNaturalSize.width;
                      const imgH = heroImageNaturalSize.height;
                      const scale = data.hero.imageScale ?? 100;

                      // CSS background-size: S% → displayed width = containerW * S/100
                      const displayedW = containerW * (scale / 100);
                      const displayedH = displayedW * (imgH / imgW);

                      // What percentage of the IMAGE is visible?
                      // Only crops when displayed > container
                      const frameWPct = Math.min(100, (containerW / displayedW) * 100);
                      const frameHPct = Math.min(100, (containerH / displayedH) * 100);

                      // Available travel range
                      const maxLeftPct = 100 - frameWPct;
                      const maxTopPct = 100 - frameHPct;
                      const posX = data.hero.imagePositionX ?? 50;
                      const posY = data.hero.imagePositionY ?? 50;
                      const frameLeft = maxLeftPct > 0 ? (posX / 100) * maxLeftPct : (100 - frameWPct) / 2;
                      const frameTop = maxTopPct > 0 ? (posY / 100) * maxTopPct : (100 - frameHPct) / 2;

                      const noCropX = frameWPct >= 100;
                      const noCropY = frameHPct >= 100;

                      return (
                        <div
                          className={`relative h-72 bg-[#121212] rounded-xl overflow-hidden border-2 flex items-center justify-center transition-all select-none ${isDraggingHero ? 'border-primary ring-4 ring-primary/10' : 'border-[#444]'}`}
                        >
                          {/* Info badge */}
                          <div className="absolute top-2 left-2 bg-black/70 text-white text-[9px] font-mono px-2 py-1 rounded z-20 leading-relaxed">
                            Imagen: {imgW}×{imgH}px — Zoom: {scale}%<br />
                            Área visible: {frameWPct.toFixed(0)}% × {frameHPct.toFixed(0)}% de la imagen
                          </div>
                          {/* Warning when no crop */}
                          {(noCropX && noCropY) && (
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-amber-500/90 text-black text-[10px] font-bold px-3 py-1.5 rounded z-20 text-center whitespace-nowrap">
                              ⚠ Zoom insuficiente — Sube el zoom para recortar y posicionar
                            </div>
                          )}
                          {/* Inner wrapper: aspect ratio matches the REAL image */}
                          <div
                            className="relative cursor-move"
                            style={{
                              aspectRatio: `${imgW} / ${imgH}`,
                              maxWidth: '100%',
                              maxHeight: '100%',
                            }}
                            onMouseDown={(e) => {
                              if (noCropX && noCropY) return; // no drag when no crop
                              setIsDraggingHero(true);
                              setDragStart({
                                x: e.clientX,
                                y: e.clientY,
                                posX: data.hero.imagePositionX ?? 50,
                                posY: data.hero.imagePositionY ?? 50
                              });
                            }}
                            onMouseMove={(e) => {
                              if (!isDraggingHero) return;
                              const rect = e.currentTarget.getBoundingClientRect();
                              const deltaXPct = ((e.clientX - dragStart.x) / rect.width) * 100;
                              const deltaYPct = ((e.clientY - dragStart.y) / rect.height) * 100;
                              const scaledDeltaX = maxLeftPct > 0 ? (deltaXPct / maxLeftPct) * 100 : 0;
                              const scaledDeltaY = maxTopPct > 0 ? (deltaYPct / maxTopPct) * 100 : 0;
                              const newX = Math.max(0, Math.min(100, dragStart.posX + scaledDeltaX));
                              const newY = Math.max(0, Math.min(100, dragStart.posY + scaledDeltaY));
                              setData({ ...data, hero: { ...data.hero, imagePositionX: Math.round(newX), imagePositionY: Math.round(newY) } });
                            }}
                            onMouseUp={() => setIsDraggingHero(false)}
                            onMouseLeave={() => setIsDraggingHero(false)}
                          >
                            {/* The image fills this wrapper */}
                            <img
                              src={data.hero.image || "/img/bg/personal.jpg"}
                              alt="Hero preview"
                              className="w-full h-full block"
                              style={{
                                filter: `brightness(${data.hero.imageBrightness ?? 1.0}) blur(${data.hero.imageBlur ?? 0}px)`
                              }}
                              draggable={false}
                              onLoad={(e) => {
                                const img = e.currentTarget;
                                setHeroImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
                              }}
                            />
                            {/* Dark overlay */}
                            <div className="absolute inset-0 bg-black/50 pointer-events-none" />
                            {/* The visible window frame */}
                            <div
                              className="absolute border-2 border-white rounded shadow-lg shadow-black/30 pointer-events-none z-10"
                              style={{
                                width: `${frameWPct}%`,
                                height: `${frameHPct}%`,
                                left: `${frameLeft}%`,
                                top: `${frameTop}%`,
                              }}
                            >
                              <div
                                className="absolute inset-0 rounded overflow-hidden"
                                style={{ backdropFilter: 'brightness(2.0)' }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-full h-[1px] bg-white/40" />
                                <div className="h-full w-[1px] bg-white/40 absolute" />
                              </div>
                              <div className="absolute -top-[3px] -left-[3px] w-2 h-2 bg-white rounded-full shadow" />
                              <div className="absolute -top-[3px] -right-[3px] w-2 h-2 bg-white rounded-full shadow" />
                              <div className="absolute -bottom-[3px] -left-[3px] w-2 h-2 bg-white rounded-full shadow" />
                              <div className="absolute -bottom-[3px] -right-[3px] w-2 h-2 bg-white rounded-full shadow" />
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex justify-between items-center bg-[#1A1A1A] px-4 py-2 rounded-lg border border-dashed border-[#444]">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Valores Actuales: X:{data.hero.imagePositionX ?? 50}% Y:{data.hero.imagePositionY ?? 50}% Zoom:{data.hero.imageScale ?? 100}%</span>
                      <button
                        onClick={() => setData({
                          ...data,
                          hero: {
                            ...data.hero,
                            imagePositionX: 50,
                            imagePositionY: 50,
                            imageScale: 100,
                            imageBrightness: 1.0,
                            imageBlur: 0
                          }
                        })}
                        className="px-3 py-1 bg-[#222] border border-[#333] rounded text-[10px] font-bold uppercase text-white hover:bg-white hover:text-black hover:border-white transition-all active:scale-95"
                      >
                        Restablecer Filtros y Posición
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Zoom / Escala</label>
                        <span className="text-xs font-mono font-bold text-white bg-[#333] px-2 py-1 rounded">{data.hero.imageScale ?? 100}%</span>
                      </div>
                      <input
                        type="range"
                        min="100"
                        max="400"
                        className="w-full h-1.5 bg-[#444] rounded-lg appearance-none cursor-pointer accent-white"
                        value={data.hero.imageScale ?? 100}
                        onChange={(e) => setData({ ...data, hero: { ...data.hero, imageScale: parseInt(e.target.value) } })}
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Luminosidad / Brillo</label>
                        <span className="text-xs font-mono font-bold text-white bg-[#333] px-2 py-1 rounded">{(data.hero.imageBrightness ?? 1.0).toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="2"
                        step="0.1"
                        className="w-full h-1.5 bg-[#444] rounded-lg appearance-none cursor-pointer accent-white"
                        value={data.hero.imageBrightness ?? 1.0}
                        onChange={(e) => setData({ ...data, hero: { ...data.hero, imageBrightness: parseFloat(e.target.value) } })}
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Desenfoque (Blur)</label>
                        <span className="text-xs font-mono font-bold text-white bg-[#333] px-2 py-1 rounded">{data.hero.imageBlur ?? 0}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        className="w-full h-1.5 bg-[#444] rounded-lg appearance-none cursor-pointer accent-white"
                        value={data.hero.imageBlur ?? 0}
                        onChange={(e) => setData({ ...data, hero: { ...data.hero, imageBlur: parseInt(e.target.value) } })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Posición X</label>
                          <span className="text-xs font-mono font-bold text-white bg-[#333] px-2 py-1 rounded">{data.hero.imagePositionX ?? 50}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          className="w-full h-1.5 bg-[#444] rounded-lg appearance-none cursor-pointer accent-white"
                          value={data.hero.imagePositionX ?? 50}
                          onChange={(e) => setData({ ...data, hero: { ...data.hero, imagePositionX: parseInt(e.target.value) } })}
                        />
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Posición Y</label>
                          <span className="text-xs font-mono font-bold text-white bg-[#333] px-2 py-1 rounded">{data.hero.imagePositionY ?? 50}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          className="w-full h-1.5 bg-[#444] rounded-lg appearance-none cursor-pointer accent-white"
                          value={data.hero.imagePositionY ?? 50}
                          onChange={(e) => setData({ ...data, hero: { ...data.hero, imagePositionY: parseInt(e.target.value) } })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-[#1A1A1A] border-t border-[#333] flex justify-end">
                    <button
                      onClick={() => {
                        setShowHeroModal(false);
                        handleSave();
                      }}
                      className="bg-white text-black px-10 py-4 rounded-xl font-bold shadow-lg hover:shadow-white/20 hover:scale-[1.02] active:scale-95 transition-all text-base"
                    >
                      Confirmar y Guardar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        }
      </div>
    </div>
  );
}
