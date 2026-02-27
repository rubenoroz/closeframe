"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Trash2, UserPlus, Users, Network } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Member {
    id: string;
    userId: string;
    role: "VIEWER" | "EDITOR" | "ADMIN" | "OWNER";
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

interface NodosShareModalProps {
    projectId: string;
    trigger?: React.ReactNode;
}

export function NodosShareModal({ projectId, trigger }: NodosShareModalProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [members, setMembers] = useState<Member[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);

    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"VIEWER" | "EDITOR" | "ADMIN">("VIEWER");
    const [inviteLoading, setInviteLoading] = useState(false);

    const [isAdmin, setIsAdmin] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/nodos/projects/${projectId}/members`);
            if (!res.ok) throw new Error("Error cargando colaboradores");
            const data = await res.json();

            setMembers(data.members);
            setInvitations(data.invitations);

            // Get current user session to determine permissions
            const sessionRes = await fetch("/api/auth/session");
            const session = await sessionRes.json();
            const uid = session?.user?.id;
            setCurrentUserId(uid);

            if (uid) {
                const currentUserMember = data.members.find((m: Member) => m.userId === uid);
                setIsAdmin(currentUserMember?.role === "ADMIN" || currentUserMember?.role === "OWNER");
            }
        } catch (error) {
            toast.error("Error cargando colaboradores");
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
            const res = await fetch(`/api/nodos/projects/${projectId}/members`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, role }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Error al invitar");
            }

            toast.success("Invitación enviada");
            setEmail("");
            fetchMembers();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al invitar");
        } finally {
            setInviteLoading(false);
        }
    };

    const handleUpdateRole = async (memberId: string, newRole: string) => {
        try {
            const res = await fetch(`/api/nodos/projects/${projectId}/members/${memberId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: newRole }),
            });

            if (!res.ok) throw new Error("Error al actualizar rol");

            toast.success("Rol actualizado");
            fetchMembers();
        } catch (error) {
            toast.error("Error al actualizar rol");
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!confirm("¿Seguro que deseas eliminar a este colaborador?")) return;

        try {
            const res = await fetch(`/api/nodos/projects/${projectId}/members/${memberId}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Error al eliminar colaborador");

            toast.success("Colaborador eliminado");
            fetchMembers();
        } catch (error) {
            toast.error("Error al eliminar colaborador");
        }
    };

    const handleCancelInvitation = async (invitationId: string) => {
        if (!confirm("¿Seguro que deseas cancelar esta invitación?")) return;

        try {
            const res = await fetch(`/api/nodos/projects/${projectId}/invitations/${invitationId}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Error al cancelar invitación");

            toast.success("Invitación cancelada");
            fetchMembers();
        } catch (error) {
            toast.error("Error al cancelar invitación");
        }
    };

    const copyInviteLink = (token: string) => {
        const url = `${window.location.origin}/dashboard/nodos?accept=${token}`;
        navigator.clipboard.writeText(url);
        toast.success("Enlace copiado al portapapeles");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2 bg-neutral-900 border-neutral-800 hover:bg-neutral-800 text-white">
                        <UserPlus size={14} /> Compartir
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-[#141414] border-neutral-800 text-white p-0 overflow-hidden rounded-2xl">
                <div className="p-6 border-b border-neutral-800 bg-neutral-900/20">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                            <Network size={22} className="text-emerald-500" />
                            Colaboradores del proyecto
                        </DialogTitle>
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-6">
                    {isAdmin && (
                        <form onSubmit={handleInvite} className="flex gap-2 items-end p-4 rounded-xl bg-neutral-900/50 border border-neutral-800/50">
                            <div className="grid gap-2 flex-1">
                                <Label htmlFor="email" className="text-[11px] uppercase tracking-wider text-neutral-500 font-bold ml-1">Invitar colaborador</Label>
                                <Input
                                    id="email"
                                    placeholder="email@ejemplo.com"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="bg-[#0A0A0A] border-neutral-800 focus:border-emerald-500/50 h-10 rounded-lg text-sm"
                                />
                            </div>
                            <Select value={role} onValueChange={(v: any) => setRole(v)}>
                                <SelectTrigger className="w-[100px] bg-[#0A0A0A] border-neutral-800 h-10 rounded-lg text-xs">
                                    <SelectValue placeholder="Rol" />
                                </SelectTrigger>
                                <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                                    <SelectItem value="VIEWER">Lector</SelectItem>
                                    <SelectItem value="EDITOR">Editor</SelectItem>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button type="submit" disabled={inviteLoading} className="bg-emerald-600 hover:bg-emerald-700 h-10 px-6 rounded-lg font-bold shadow-lg shadow-emerald-900/10">
                                {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invitar"}
                            </Button>
                        </form>
                    )}

                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h4 className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Miembros del equipo</h4>
                            <span className="text-[10px] text-neutral-600 bg-neutral-900 px-2 py-0.5 rounded-full border border-neutral-800">
                                {members.length + invitations.length} Total
                            </span>
                        </div>

                        {loading ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-emerald-500" /></div>
                        ) : (
                            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                                {members.map((member) => {
                                    const isSelf = member.userId === currentUserId;
                                    const isOwner = member.role === 'OWNER';

                                    return (
                                        <div key={member.id} className="flex items-center justify-between group p-3 rounded-xl hover:bg-neutral-900/40 transition-all border border-transparent hover:border-neutral-800/50">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9 border border-neutral-800 ring-2 ring-black">
                                                    <AvatarImage src={member.user.image || ""} />
                                                    <AvatarFallback className="bg-neutral-800 text-neutral-400 font-bold text-xs">
                                                        {member.user.name?.[0] || member.user.email[0].toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="text-sm">
                                                    <div className="font-bold text-neutral-200 flex items-center gap-1.5">
                                                        {member.user.name || "Usuario"}
                                                        {isSelf && <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded-full border border-emerald-500/20">Tú</span>}
                                                    </div>
                                                    <div className="text-neutral-500 text-[11px]">{member.user.email}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {isAdmin && !isOwner && !isSelf ? (
                                                    <div className="flex items-center gap-1">
                                                        <Select
                                                            value={member.role}
                                                            onValueChange={(v) => handleUpdateRole(member.id, v)}
                                                        >
                                                            <SelectTrigger className="h-7 w-[90px] bg-transparent border-none text-[10px] font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 px-2">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                                                                <SelectItem value="VIEWER">Lector</SelectItem>
                                                                <SelectItem value="EDITOR">Editor</SelectItem>
                                                                <SelectItem value="ADMIN">Admin</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-neutral-600 hover:text-red-500 hover:bg-red-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                                            onClick={() => handleRemoveMember(member.id)}
                                                        >
                                                            <Trash2 size={12} />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className={cn(
                                                        "text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-tighter",
                                                        isOwner ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-neutral-900 text-neutral-500 border-neutral-800"
                                                    )}>
                                                        {isOwner ? 'Propietario' : member.role}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {invitations.map((invite) => (
                                    <div key={invite.id} className="flex items-center justify-between p-3 rounded-xl bg-[#111111] border border-emerald-500/10">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-full bg-neutral-900 flex items-center justify-center border border-dashed border-neutral-750 ring-2 ring-black">
                                                <UserPlus size={14} className="text-neutral-600" />
                                            </div>
                                            <div className="text-sm">
                                                <div className="font-bold text-neutral-400">{invite.email}</div>
                                                <div className="text-[10px] flex items-center gap-2">
                                                    <span className="text-emerald-600 font-bold uppercase tracking-widest text-[9px]">Pendiente</span>
                                                    <button
                                                        onClick={() => copyInviteLink(invite.token)}
                                                        className="text-neutral-500 hover:text-white transition-colors"
                                                    >
                                                        Copiar link
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-[9px] px-2 py-0.5 bg-neutral-900 border border-neutral-850 rounded-full text-neutral-500 font-bold">
                                                {invite.role}
                                            </div>
                                            {isAdmin && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-neutral-600 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all"
                                                    onClick={() => handleCancelInvitation(invite.id)}
                                                    title="Cancelar invitación"
                                                >
                                                    <Trash2 size={12} />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {members.length === 0 && invitations.length === 0 && (
                                    <div className="text-center text-sm text-neutral-600 py-12 border-2 border-dashed border-neutral-900 rounded-3xl bg-neutral-900/5">
                                        <Users className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                        No hay colaboradores aún.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
