"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Trash2, UserPlus, Shield } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Types
interface Member {
    id: string;
    userId: string;
    role: "VIEWER" | "EDITOR" | "ADMIN";
    user: {
        name: string | null;
        email: string;
        image: string | null;
    };
}

interface Invitation {
    id: string;
    email: string;
    role: "VIEWER" | "EDITOR" | "ADMIN";
    status: string;
    token: string;
}

interface ShareProjectModalProps {
    projectId: string;
    trigger?: React.ReactNode;
}

export function ShareProjectModal({ projectId, trigger }: ShareProjectModalProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [members, setMembers] = useState<Member[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);

    // Invite Form
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"VIEWER" | "EDITOR" | "ADMIN">("VIEWER");
    const [inviteLoading, setInviteLoading] = useState(false);

    const router = useRouter();

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/scena/projects/${projectId}/members`);
            if (!res.ok) throw new Error("Failed to load members");
            const data = await res.json();
            setMembers(data.members);
            setInvitations(data.invitations);
        } catch (error) {
            toast.error("Error cargando miembros");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            fetchMembers();
        }
    }, [open, projectId]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviteLoading(true);

        try {
            const res = await fetch(`/api/scena/projects/${projectId}/members`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, role }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to invite");
            }

            toast.success(data.type === "member" ? "Usuario añadido al proyecto" : "Invitación enviada");
            setEmail("");
            fetchMembers(); // Refresh list
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al invitar");
        } finally {
            setInviteLoading(false);
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!confirm("¿Estás seguro de que quieres eliminar a este usuario del proyecto?")) return;

        try {
            const res = await fetch(`/api/scena/projects/${projectId}/members/${memberId}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to remove");

            toast.success("Miembro eliminado");
            fetchMembers();
        } catch (error) {
            toast.error("Error al eliminar miembro");
        }
    };

    const handleUpdateRole = async (memberId: string, newRole: string) => {
        try {
            const res = await fetch(`/api/scena/projects/${projectId}/members/${memberId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: newRole }),
            });

            if (!res.ok) throw new Error("Failed to update");

            toast.success("Rol actualizado");
            fetchMembers();
        } catch (error) {
            toast.error("Error al actualizar rol");
        }
    };

    const handleCancelInvite = async (invitationId: string) => {
        if (!confirm("¿Cancelar esta invitación?")) return;

        try {
            const res = await fetch(`/api/scena/invitations/${invitationId}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to cancel");

            toast.success("Invitación cancelada");
            fetchMembers();
        } catch (error) {
            toast.error("Error al cancelar invitación");
        }
    };

    // Copy invite link if invitation exists
    const copyInviteLink = (token: string) => {
        const url = `${window.location.origin}/invite/accept?token=${token}`;
        navigator.clipboard.writeText(url);
        toast.success("Enlace copiado al portapapeles");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline" size="sm" className="gap-2"><UserPlus size={14} /> Compartir</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Compartir Proyecto</DialogTitle>
                </DialogHeader>

                {/* Invite Form */}
                <form onSubmit={handleInvite} className="flex gap-2 items-end mb-4">
                    <div className="grid gap-2 flex-1">
                        <Label htmlFor="email" className="sr-only">Email</Label>
                        <Input
                            id="email"
                            placeholder="email@ejemplo.com"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <Select value={role} onValueChange={(v: any) => setRole(v)}>
                        <SelectTrigger className="w-[110px]">
                            <SelectValue placeholder="Rol" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="VIEWER">Viewer</SelectItem>
                            <SelectItem value="EDITOR">Editor</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button type="submit" disabled={inviteLoading}>
                        {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invitar"}
                    </Button>
                </form>

                <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Miembros</h4>
                    {loading ? (
                        <div className="flex justify-center p-4"><Loader2 className="animate-spin text-muted-foreground" /></div>
                    ) : (
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                            {/* Members List */}
                            {members.map((member) => (
                                <div key={member.id} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={member.user.image || ""} />
                                            <AvatarFallback>{member.user.name?.[0] || member.user.email[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="text-sm">
                                            <div className="font-medium">{member.user.name || "Usuario"}</div>
                                            <div className="text-muted-foreground text-xs">{member.user.email}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Select
                                            defaultValue={member.role}
                                            onValueChange={(v) => handleUpdateRole(member.id, v)}
                                        >
                                            <SelectTrigger className="h-8 w-[90px] text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="VIEWER">Viewer</SelectItem>
                                                <SelectItem value="EDITOR">Editor</SelectItem>
                                                <SelectItem value="ADMIN">Admin</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-neutral-500 hover:text-red-500"
                                            onClick={() => handleRemoveMember(member.id)}
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            {/* Pending Invitations */}
                            {invitations.map((invite) => (
                                <div key={invite.id} className="flex items-center justify-between opacity-70">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center border border-dashed border-neutral-300">
                                            <UserPlus size={14} className="text-neutral-400" />
                                        </div>
                                        <div className="text-sm">
                                            <div className="font-medium text-neutral-500">{invite.email}</div>
                                            <div className="text-muted-foreground text-xs flex items-center gap-1">
                                                Pendiente •
                                                <button onClick={() => copyInviteLink(invite.token)} className="hover:underline text-blue-500">
                                                    Copiar Link
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-xs px-2 py-1 bg-neutral-100 rounded text-neutral-500">
                                            {invite.role}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-neutral-500 hover:text-red-500"
                                            onClick={() => handleCancelInvite(invite.id)}
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            {members.length === 0 && invitations.length === 0 && (
                                <div className="text-center text-sm text-muted-foreground py-4">
                                    No hay miembros aún.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
