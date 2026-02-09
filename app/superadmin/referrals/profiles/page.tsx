"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, RefreshCw } from "lucide-react";

interface ReferralProfile {
    id: string;
    name: string;
    type: "AFFILIATE" | "CUSTOMER";
    isDefault: boolean;
    isActive: boolean;
    config: any;
    _count: { assignments: number };
}

export default function ProfilesPage() {
    const [profiles, setProfiles] = useState<ReferralProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [editProfile, setEditProfile] = useState<ReferralProfile | null>(null);
    const [editName, setEditName] = useState("");
    const [editPercentage, setEditPercentage] = useState("10");
    const [editMinReferrals, setEditMinReferrals] = useState("0");
    const [editMinThreshold, setEditMinThreshold] = useState("500");
    const [editGracePeriod, setEditGracePeriod] = useState("30");
    const [editTiers, setEditTiers] = useState<{ minReferrals: number; percentage: number }[]>([]);

    const fetchProfiles = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/superadmin/referrals/profiles");
            if (res.ok) {
                const data = await res.json();
                setProfiles(data);
            }
        } catch (error) {
            console.error("Error fetching profiles:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);

    const handleCreate = async (formData: FormData) => {
        const name = formData.get("name") as string;
        const type = formData.get("type") as string;

        try {
            const res = await fetch("/api/superadmin/referrals/profiles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, type }),
            });

            if (res.ok) {
                setCreateOpen(false);
                fetchProfiles();
            }
        } catch (error) {
            console.error("Error creating profile:", error);
        }
    };

    const handleToggleActive = async (profile: ReferralProfile) => {
        try {
            const res = await fetch(`/api/superadmin/referrals/profiles/${profile.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !profile.isActive }),
            });

            if (res.ok) {
                fetchProfiles();
            }
        } catch (error) {
            console.error("Error updating profile:", error);
        }
    };

    const handleDelete = async (profileId: string) => {
        if (!confirm("¿Estás seguro de eliminar este perfil?")) return;

        try {
            const res = await fetch(`/api/superadmin/referrals/profiles/${profileId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                fetchProfiles();
            }
        } catch (error) {
            console.error("Error deleting profile:", error);
        }
    };

    const openEditModal = (profile: ReferralProfile) => {
        setEditProfile(profile);
        setEditName(profile.name);
        const config = profile.config || {};
        const pct = config.reward?.percentage;
        setEditPercentage(pct ? String(pct * 100) : "10");
        const minRef = config.qualification?.minReferrals || 0;
        setEditMinReferrals(String(minRef));

        setEditMinThreshold(String(config.payoutSettings?.minThreshold || 500));
        setEditGracePeriod(String(config.qualification?.gracePeriodDays || 30));
        setEditTiers(config.tiers || []);
    };

    const addTier = () => {
        setEditTiers([...editTiers, { minReferrals: 0, percentage: 10 }]);
    };

    const removeTier = (index: number) => {
        setEditTiers(editTiers.filter((_, i) => i !== index));
    };

    const updateTier = (index: number, field: "minReferrals" | "percentage", value: string) => {
        const newTiers = [...editTiers];
        if (field === "minReferrals") {
            newTiers[index].minReferrals = parseInt(value) || 0;
        } else {
            newTiers[index].percentage = parseFloat(value) / 100 || 0;
        }
        setEditTiers(newTiers);
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editProfile) return;

        const percentage = parseFloat(editPercentage) || 10;
        const minReferrals = parseInt(editMinReferrals) || 0;
        const minThreshold = parseFloat(editMinThreshold) || 500;
        const gracePeriodDays = parseInt(editGracePeriod) || 30;

        try {
            const res = await fetch(`/api/superadmin/referrals/profiles/${editProfile.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editName,
                    config: {
                        ...editProfile.config,
                        reward: {
                            ...editProfile.config?.reward,
                            type: "PERCENTAGE",
                            percentage: percentage / 100,
                        },
                        qualification: {
                            ...editProfile.config?.qualification,
                            minReferrals,
                            gracePeriodDays
                        },
                        payoutSettings: {
                            ...editProfile.config?.payoutSettings,
                            minThreshold
                        },
                        tiers: editTiers.sort((a, b) => a.minReferrals - b.minReferrals)
                    }
                }),
            });

            if (res.ok) {
                setEditProfile(null);
                fetchProfiles();
            }
        } catch (error) {
            console.error("Error updating profile:", error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Perfiles de Referido</h1>
                    <p className="text-muted-foreground">
                        Gestiona los tipos de programa de referidos
                    </p>
                </div>
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Nuevo Perfil
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Crear Perfil de Referido</DialogTitle>
                        </DialogHeader>
                        <form
                            action={handleCreate}
                            className="space-y-4"
                        >
                            <div>
                                <Label htmlFor="name">Nombre</Label>
                                <Input id="name" name="name" required />
                            </div>
                            <div>
                                <Label htmlFor="type">Tipo</Label>
                                <Select name="type" defaultValue="AFFILIATE">
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="AFFILIATE">Afiliado</SelectItem>
                                        <SelectItem value="CUSTOMER">Cliente</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button type="submit" className="w-full">
                                Crear Perfil
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {profiles.map((profile) => (
                    <Card key={profile.id}>
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle className="text-lg">{profile.name}</CardTitle>
                                    <div className="flex gap-2 mt-1">
                                        <Badge variant={profile.type === "AFFILIATE" ? "default" : "secondary"}>
                                            {profile.type === "AFFILIATE" ? "Afiliado" : "Cliente"}
                                        </Badge>
                                        {profile.isDefault && (
                                            <Badge variant="outline">Default</Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={profile.isActive}
                                        onCheckedChange={() => handleToggleActive(profile)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 text-sm">
                                <div className="space-y-1">
                                    <span className="text-muted-foreground text-xs block uppercase tracking-wider font-semibold">Comisión</span>
                                    {profile.config?.tiers && profile.config.tiers.length > 0 ? (
                                        <div className="space-y-1 bg-muted/50 p-2 rounded-md border text-xs">
                                            {profile.config.tiers.map((tier: any, i: number) => (
                                                <div key={i} className="flex justify-between">
                                                    <span>Desde {tier.minReferrals} refs</span>
                                                    <span className="font-bold">{(tier.percentage * 100).toFixed(0)}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between font-medium">
                                            <span>Base</span>
                                            <span>
                                                {profile.config?.reward?.percentage
                                                    ? `${(profile.config.reward.percentage * 100).toFixed(0)}%`
                                                    : "10%"}
                                                {profile.type === "CUSTOMER" && " (crédito)"}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground text-[10px] uppercase font-bold">Gracia</span>
                                        <span className="font-medium text-xs">{profile.config?.qualification?.gracePeriodDays || 0} días</span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-muted-foreground text-[10px] uppercase font-bold">Mín. Pago</span>
                                        <span className="font-medium text-xs">${profile.config?.payoutSettings?.minThreshold || 0}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t">
                                    <span className="text-muted-foreground">Asignaciones</span>
                                    <span className="font-medium">{profile._count.assignments}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => openEditModal(profile)}
                                >
                                    <Edit className="h-4 w-4 mr-1" />
                                    Editar
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDelete(profile.id)}
                                    disabled={profile._count.assignments > 0}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Edit Profile Dialog */}
            <Dialog open={!!editProfile} onOpenChange={(open) => !open && setEditProfile(null)}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Editar Perfil: {editProfile?.name}</DialogTitle>
                    </DialogHeader>
                    {editProfile && (
                        <form onSubmit={handleEdit} className="space-y-5">
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="edit-name">Nombre</Label>
                                    <Input
                                        id="edit-name"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-percentage">Comisión Base (%)</Label>
                                        <Input
                                            id="edit-percentage"
                                            type="number"
                                            value={editPercentage}
                                            onChange={(e) => setEditPercentage(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-gracePeriod">Días de Gracia</Label>
                                        <Input
                                            id="edit-gracePeriod"
                                            type="number"
                                            value={editGracePeriod}
                                            onChange={(e) => setEditGracePeriod(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                {editProfile.type === "AFFILIATE" && (
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-threshold">Mínimo para Cobrar (MXN)</Label>
                                        <Input
                                            id="edit-threshold"
                                            type="number"
                                            value={editMinThreshold}
                                            onChange={(e) => setEditMinThreshold(e.target.value)}
                                            required
                                        />
                                    </div>
                                )}

                                <div className="pt-4 border-t space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-bold">Niveles (Escalonado)</Label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={addTier}
                                        >
                                            + Añadir Nivel
                                        </Button>
                                    </div>

                                    <div className="space-y-2">
                                        {editTiers.map((tier, index) => (
                                            <div key={index} className="flex items-center gap-2 bg-muted/30 p-2 rounded-md border">
                                                <div className="flex-1">
                                                    <span className="text-[10px] text-muted-foreground uppercase font-bold px-1">Refs Min</span>
                                                    <Input
                                                        type="number"
                                                        value={tier.minReferrals}
                                                        onChange={(e) => updateTier(index, "minReferrals", e.target.value)}
                                                        className="h-8"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <span className="text-[10px] text-muted-foreground uppercase font-bold px-1">% Comisión</span>
                                                    <Input
                                                        type="number"
                                                        value={(tier.percentage * 100).toFixed(0)}
                                                        onChange={(e) => updateTier(index, "percentage", e.target.value)}
                                                        className="h-8"
                                                    />
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeTier(index)}
                                                    className="mt-4"
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        ))}
                                        {editTiers.length === 0 && (
                                            <p className="text-xs text-muted-foreground italic text-center py-2">
                                                No hay niveles extras. Se usará solo la comisión base.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setEditProfile(null)}
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" className="flex-1">
                                    Guardar Cambios
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
