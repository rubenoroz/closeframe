"use client";

import { useEffect, useState } from "react";
import {
    Settings,
    Save,
    Loader2,
    Database,
    Shield,
    Globe
} from "lucide-react";

interface SystemSettings {
    siteName: string;
    siteDescription: string;
    maintenanceMode: boolean;
    allowRegistration: boolean;
    defaultPlanId: string | null;
    maxProjectsDefault: number;
    maxCloudAccountsDefault: number;
    maxCloudAccountsDefault: number;
    zipDownloadsDefault: number;
    masterInviteCode?: string; // New field
}

const defaultSettings: SystemSettings = {
    siteName: "Closerlens",
    siteDescription: "Plataforma para fotógrafos profesionales",
    maintenanceMode: false,
    allowRegistration: true,
    defaultPlanId: null,
    maxProjectsDefault: 3,
    maxCloudAccountsDefault: 1,
    zipDownloadsDefault: 5,
    masterInviteCode: ""
};

export default function SettingsPage() {
    const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch("/api/superadmin/settings");
                if (res.ok) {
                    const data = await res.json();
                    // Merge with defaults to ensure all keys exist
                    setSettings({ ...defaultSettings, ...data });
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/superadmin/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings)
            });

            if (!res.ok) throw new Error("Failed to save");

            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Error guardando configuración");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Configuración</h1>
                    <p className="text-neutral-400 mt-1">
                        Configuraciones del sistema
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl font-medium transition disabled:opacity-50"
                >
                    {saving ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Save className="w-5 h-5" />
                    )}
                    {saved ? "¡Guardado!" : "Guardar cambios"}
                </button>
            </div>

            {/* General Settings */}
            <section className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-violet-500/20 rounded-lg">
                        <Globe className="w-5 h-5 text-violet-400" />
                    </div>
                    <h2 className="text-lg font-semibold">General</h2>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                            Nombre del sitio
                        </label>
                        <input
                            type="text"
                            value={settings.siteName}
                            onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                            className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-violet-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                            Descripción
                        </label>
                        <textarea
                            value={settings.siteDescription}
                            onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                            rows={2}
                            className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-violet-500 resize-none"
                        />
                    </div>
                </div>
            </section>

            {/* Security Settings */}
            <section className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-amber-500/20 rounded-lg">
                        <Shield className="w-5 h-5 text-amber-400" />
                    </div>
                    <h2 className="text-lg font-semibold">Seguridad y Acceso</h2>
                </div>

                <div className="space-y-4">
                    <label className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-xl cursor-pointer hover:bg-neutral-800/70 transition">
                        <div>
                            <p className="font-medium">Modo mantenimiento</p>
                            <p className="text-sm text-neutral-400">
                                Solo los administradores pueden acceder al sitio
                            </p>
                        </div>
                        <input
                            type="checkbox"
                            checked={settings.maintenanceMode}
                            onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                            className="w-5 h-5 rounded bg-neutral-800 border-neutral-700 text-violet-600 focus:ring-violet-500"
                        />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-xl cursor-pointer hover:bg-neutral-800/70 transition">
                        <div>
                            <p className="font-medium">Permitir registro</p>
                            <p className="text-sm text-neutral-400">
                                Los usuarios pueden crear nuevas cuentas
                            </p>
                        </div>
                        <input
                            type="checkbox"
                            checked={settings.allowRegistration}
                            onChange={(e) => setSettings({ ...settings, allowRegistration: e.target.checked })}
                            className="w-5 h-5 rounded bg-neutral-800 border-neutral-700 text-violet-600 focus:ring-violet-500"
                        />
                    </label>
                </div>

                <div className="mt-6 border-t border-neutral-800 pt-6">
                    <h3 className="text-sm font-medium text-neutral-300 mb-3">Beta Cerrada</h3>
                    <div className="flex flex-col gap-2">
                        <label className="block text-xs text-neutral-400">
                            Código Maestro de Invitación
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={settings.masterInviteCode || ""}
                                onChange={(e) => setSettings({ ...settings, masterInviteCode: e.target.value })}
                                placeholder="Ej: VIP2025"
                                className="flex-1 px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-violet-500 font-mono tracking-wider"
                            />
                            <div className="p-2 bg-neutral-800 rounded-lg border border-neutral-700 flex items-center justify-center text-neutral-400" title="Este código se guarda en la base de datos y tiene prioridad sobre el .env">
                                <Database className="w-4 h-4" />
                            </div>
                        </div>
                        <p className="text-xs text-neutral-500">
                            Cualquier usuario con este código podrá registrarse, ignorando los límites de referidos.
                        </p>
                    </div>
                </div>
            </section >

            {/* Default Limits */}
            < section className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6" >
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Database className="w-5 h-5 text-blue-400" />
                    </div>
                    <h2 className="text-lg font-semibold">Límites por Defecto</h2>
                </div>

                <p className="text-sm text-neutral-400 mb-4">
                    Estos valores se aplican a usuarios que no tienen un plan asignado.
                </p>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                            Máximo de proyectos
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={settings.maxProjectsDefault}
                            onChange={(e) => setSettings({
                                ...settings,
                                maxProjectsDefault: parseInt(e.target.value) || 0
                            })}
                            className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-violet-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                            Máximo de nubes
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={settings.maxCloudAccountsDefault}
                            onChange={(e) => setSettings({
                                ...settings,
                                maxCloudAccountsDefault: parseInt(e.target.value) || 0
                            })}
                            className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-violet-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                            Descargas ZIP/mes
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={settings.zipDownloadsDefault}
                            onChange={(e) => setSettings({
                                ...settings,
                                zipDownloadsDefault: parseInt(e.target.value) || 0
                            })}
                            className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-violet-500"
                        />
                    </div>
                </div>
            </section >

            {/* Database Info */}
            < section className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6" >
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                        <Database className="w-5 h-5 text-green-400" />
                    </div>
                    <h2 className="text-lg font-semibold">Información del Sistema</h2>
                </div>

                <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-neutral-800">
                        <span className="text-neutral-400">Base de datos</span>
                        <span className="text-neutral-200">SQLite (dev.db)</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-neutral-800">
                        <span className="text-neutral-400">Migración a Supabase</span>
                        <span className="text-amber-400">Pendiente</span>
                    </div>
                    <div className="flex justify-between py-2">
                        <span className="text-neutral-400">Versión</span>
                        <span className="text-neutral-200">1.0.0-beta</span>
                    </div>
                </div>
            </section >
        </div >
    );
}
