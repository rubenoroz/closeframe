"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
    Search,
    Filter,
    MoreVertical,
    Edit2,
    Trash2,
    Shield,
    Loader2,
    ChevronLeft,
    ChevronRight,
    X
} from "lucide-react";
import { cn } from "@/lib/utils";
import FeatureDragManager from "./FeatureDragManager";

interface User {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    role: string;
    planId: string | null;
    planExpiresAt: string | null;
    createdAt: string;
    plan: {
        id: string;
        displayName: string;
    } | null;
    featureOverrides?: any; // Add this
    _count: {
        projects: number;
        bookings: number;
        cloudAccounts: number;
    };
}

interface Plan {
    id: string;
    displayName: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface ActionDropdownProps {
    userId: string;
    onEdit: () => void;
    onDelete: () => void;
    onClose: () => void;
}

function ActionDropdown({ userId, onEdit, onDelete, onClose }: ActionDropdownProps) {
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

    useEffect(() => {
        const updatePosition = () => {
            const btn = document.getElementById(`action-btn-${userId}`);
            if (btn) {
                const rect = btn.getBoundingClientRect();

                // Calcular posición: alineado a la derecha del botón
                // Usamos fixed para que no dependa del scroll del documento en el cálculo, 
                // pero si el usuario hace scroll, el menú debe moverse o cerrarse.
                // Usemos fixed top/left directos del rect.

                setPosition({
                    top: rect.bottom + 5,
                    left: rect.right - 160
                });
            }
        };

        updatePosition();

        // Reposicionar al hacer scroll o resize
        window.addEventListener("scroll", updatePosition, true); // true para capturar scroll de contenedores
        window.addEventListener("resize", updatePosition);

        return () => {
            window.removeEventListener("scroll", updatePosition, true);
            window.removeEventListener("resize", updatePosition);
        };
    }, [userId]);

    if (!position || typeof document === 'undefined') return null;

    return createPortal(
        <>
            <div
                className="fixed inset-0 z-[90]"
                onClick={onClose}
            />
            <div
                className="fixed z-[100] bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden min-w-[160px]"
                style={{
                    top: position.top,
                    left: position.left,
                }}
            >
                <button
                    onClick={onEdit}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-neutral-800 transition text-sm text-white"
                >
                    <Edit2 className="w-4 h-4" />
                    Editar
                </button>
                <button
                    onClick={onDelete}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-red-400 hover:bg-neutral-800 transition text-sm"
                >
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                </button>
            </div>
        </>,
        document.body
    );
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [planFilter, setPlanFilter] = useState("");
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [actionMenu, setActionMenu] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
                ...(search && { search }),
                ...(roleFilter && { role: roleFilter }),
                ...(planFilter && { planId: planFilter })
            });

            const response = await fetch(`/api/superadmin/users?${params}`);
            const data = await response.json();

            if (data.pagination) {
                setUsers(data.users);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, search, roleFilter, planFilter]);

    const fetchPlans = async () => {
        try {
            const response = await fetch("/api/superadmin/plans");
            const data = await response.json();
            if (data.plans) {
                setPlans(data.plans);
            } else if (Array.isArray(data)) {
                setPlans(data);
            } else {
                setPlans([]);
            }
        } catch (error) {
            console.error("Error fetching plans:", error);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchUsers();
    };

    const handleUpdateUser = async (updates: { role?: string; planId?: string | null, featureOverrides?: any }) => {
        if (!editingUser) return;

        setSaving(true);
        try {
            const payload = {
                userId: editingUser.id,
                ...updates
            };
            console.log("[SuperAdmin] Updating user with payload:", payload);

            const response = await fetch("/api/superadmin/users", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            console.log("[SuperAdmin] Response:", response.status, data);

            if (response.ok) {
                await fetchUsers();
                setEditingUser(null);
            } else {
                alert(`Error al actualizar: ${data.error || 'Error desconocido'}`);
            }
        } catch (error) {
            console.error("Error updating user:", error);
            alert("Error de conexión al actualizar usuario");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.")) {
            return;
        }

        try {
            const response = await fetch(`/api/superadmin/users?userId=${userId}`, {
                method: "DELETE"
            });

            if (response.ok) {
                await fetchUsers();
            }
        } catch (error) {
            console.error("Error deleting user:", error);
        }
        setActionMenu(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Usuarios</h1>
                <p className="text-neutral-400 mt-1">
                    Gestiona los usuarios del sistema
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
                <form onSubmit={handleSearch} className="flex-1 min-w-[300px]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500 transition"
                        />
                    </div>
                </form>

                <select
                    value={roleFilter}
                    onChange={(e) => {
                        setRoleFilter(e.target.value);
                        setPagination(prev => ({ ...prev, page: 1 }));
                    }}
                    className="px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-violet-500"
                >
                    <option value="">Todos los roles</option>
                    <option value="USER">Usuario</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SUPERADMIN">Super Admin</option>
                </select>

                <select
                    value={planFilter}
                    onChange={(e) => {
                        setPlanFilter(e.target.value);
                        setPagination(prev => ({ ...prev, page: 1 }));
                    }}
                    className="px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-violet-500"
                >
                    <option value="">Todos los planes</option>
                    <option value="none">Sin plan</option>
                    {plans.map(plan => (
                        <option key={plan.id} value={plan.id}>{plan.displayName}</option>
                    ))}
                </select>
            </div>

            {/* Users Table */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-neutral-400 text-sm border-b border-neutral-800 bg-neutral-900/50">
                                        <th className="px-6 py-4 font-medium">Usuario</th>
                                        <th className="px-6 py-4 font-medium">Rol</th>
                                        <th className="px-6 py-4 font-medium">Plan</th>
                                        <th className="px-6 py-4 font-medium">Proyectos</th>
                                        <th className="px-6 py-4 font-medium">Registro</th>
                                        <th className="px-6 py-4 font-medium w-20"></th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {users.map((user) => (
                                        <tr
                                            key={user.id}
                                            className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {user.image ? (
                                                        <img
                                                            src={user.image}
                                                            alt={user.name || ""}
                                                            className="w-10 h-10 rounded-full"
                                                            referrerPolicy="no-referrer"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
                                                            <span className="text-neutral-400 font-medium">
                                                                {(user.name || user.email)[0].toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-medium">{user.name || "Sin nombre"}</p>
                                                        <p className="text-neutral-400 text-xs">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-lg text-xs font-medium",
                                                    user.role === "SUPERADMIN" && "bg-violet-500/20 text-violet-400",
                                                    user.role === "ADMIN" && "bg-amber-500/20 text-amber-400",
                                                    user.role === "USER" && "bg-blue-500/20 text-blue-400"
                                                )}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-lg text-xs font-medium",
                                                    user.plan
                                                        ? "bg-green-500/20 text-green-400"
                                                        : "bg-neutral-700/50 text-neutral-400"
                                                )}>
                                                    {user.plan?.displayName || "Sin plan"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-neutral-400">
                                                {user._count.projects}
                                            </td>
                                            <td className="px-6 py-4 text-neutral-400">
                                                {new Date(user.createdAt).toLocaleDateString("es-MX", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric"
                                                })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="relative">
                                                    <button
                                                        id={`action-btn-${user.id}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActionMenu(actionMenu === user.id ? null : user.id);
                                                        }}
                                                        className="p-2 hover:bg-neutral-800 rounded-lg transition"
                                                    >
                                                        <MoreVertical className="w-4 h-4 text-neutral-400" />
                                                    </button>

                                                    {actionMenu === user.id && (
                                                        <ActionDropdown
                                                            userId={user.id}
                                                            onEdit={() => {
                                                                setEditingUser(user);
                                                                setActionMenu(null);
                                                            }}
                                                            onDelete={() => handleDeleteUser(user.id)}
                                                            onClose={() => setActionMenu(null)}
                                                        />
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800">
                            <p className="text-sm text-neutral-400">
                                Mostrando {users.length} de {pagination.total} usuarios
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                    disabled={pagination.page <= 1}
                                    className="p-2 hover:bg-neutral-800 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm text-neutral-400">
                                    Página {pagination.page} de {pagination.totalPages}
                                </span>
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                    disabled={pagination.page >= pagination.totalPages}
                                    className="p-2 hover:bg-neutral-800 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
                            <h2 className="text-lg font-semibold">Editar Usuario</h2>
                            <button
                                onClick={() => setEditingUser(null)}
                                className="p-2 hover:bg-neutral-800 rounded-lg transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* User Info */}
                            <div className="flex items-center gap-3 p-4 bg-neutral-800/50 rounded-xl">
                                {editingUser.image ? (
                                    <img
                                        src={editingUser.image}
                                        alt={editingUser.name || ""}
                                        className="w-12 h-12 rounded-full"
                                        referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-neutral-700 flex items-center justify-center">
                                        <span className="text-neutral-400 font-medium text-lg">
                                            {(editingUser.name || editingUser.email)[0].toUpperCase()}
                                        </span>
                                    </div>
                                )}
                                <div>
                                    <p className="font-medium">{editingUser.name || "Sin nombre"}</p>
                                    <p className="text-neutral-400 text-sm">{editingUser.email}</p>
                                </div>
                            </div>

                            {/* Role Select */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-300 mb-2">
                                    Rol
                                </label>
                                <select
                                    value={editingUser.role}
                                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-violet-500"
                                >
                                    <option value="USER">Usuario</option>
                                    <option value="ADMIN">Admin</option>
                                    <option value="SUPERADMIN">Super Admin</option>
                                </select>
                            </div>

                            {/* Plan Select */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-300 mb-2">
                                    Plan
                                </label>
                                <select
                                    value={editingUser.planId || ""}
                                    onChange={(e) => setEditingUser({
                                        ...editingUser,
                                        planId: e.target.value || null
                                    })}
                                    className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-violet-500"
                                >
                                    <option value="">Sin plan</option>
                                    {plans.map(plan => (
                                        <option key={plan.id} value={plan.id}>{plan.displayName}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Feature Overrides Drag & Drop */}
                        <div className="p-6 border-t border-neutral-800">
                            <FeatureDragManager
                                userPlanId={editingUser.planId}
                                currentOverrides={editingUser.featureOverrides || {}}
                                onChange={(newOverrides) => setEditingUser({ ...editingUser, featureOverrides: newOverrides })}
                            />
                        </div>

                        <div className="flex justify-end gap-3 p-6 border-t border-neutral-800">
                            <button
                                onClick={() => setEditingUser(null)}
                                className="px-4 py-2 text-neutral-400 hover:text-white transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleUpdateUser({
                                    role: editingUser.role,
                                    planId: editingUser.planId,
                                    featureOverrides: editingUser.featureOverrides
                                })}
                                disabled={saving}
                                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl font-medium transition disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                Guardar cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
