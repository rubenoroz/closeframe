import { Node, Edge } from '@xyflow/react';

export interface MindMapProject {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
    nodes: Node[];
    edges: Edge[];
}

const STORAGE_KEY = 'nodos_projects';

export function getProjects(): MindMapProject[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

export function saveProject(project: MindMapProject) {
    if (typeof window === 'undefined') return;
    const projects = getProjects();
    const index = projects.findIndex(p => p.id === project.id);

    if (index >= 0) {
        projects[index] = { ...project, updatedAt: Date.now() };
    } else {
        projects.push({ ...project, createdAt: Date.now(), updatedAt: Date.now() });
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function getProject(id: string): MindMapProject | null {
    const projects = getProjects();
    return projects.find(p => p.id === id) || null;
}

export function deleteProject(id: string) {
    if (typeof window === 'undefined') return;
    const projects = getProjects();
    const updated = projects.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function createProject(title: string = 'Nuevo Mapa'): MindMapProject {
    const newProject: MindMapProject = {
        id: `proj_${Date.now()}`,
        title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
            {
                id: '1',
                type: 'mindmap',
                position: {
                    x: typeof window !== 'undefined' ? window.innerWidth / 2 - 100 : 400,
                    y: typeof window !== 'undefined' ? window.innerHeight / 2 - 50 : 300
                },
                data: { label: title, description: 'Idea central', shape: 'card' }
            }
        ],
        edges: []
    };
    saveProject(newProject);
    return newProject;
}
