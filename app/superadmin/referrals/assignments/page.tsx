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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, RefreshCw, Copy, ExternalLink } from "lucide-react";

interface Assignment {
    id: string;
    referralCode: string;
    customSlug: string | null;
    status: string;
    totalClicks: number;
    totalReferrals: number;
    totalConverted: number;
    totalEarned: string;
    user: { id: string; name: string; email: string };
    profile: { id: string; name: string; type: string };
    createdAt: string;
}

interface Profile {
    id: string;
    name: string;
    type: string;
}

interface User {
    id: string;
    name: string | null;
    email: string;
}

export default function AssignmentsPage() {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [userSearch, setUserSearch] = useState("");

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [assignmentsRes, profilesRes] = await Promise.all([
                fetch("/api/superadmin/referrals/assignments"),
                fetch("/api/superadmin/referrals/profiles"),
            ]);

            if (assignmentsRes.ok) {
                const data = await assignmentsRes.json();
                setAssignments(data);
            }
            if (profilesRes.ok) {
                const data = await profilesRes.json();
                setProfiles(data);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const searchUsers = async (query: string) => {
        if (query.length < 2) return;
        try {
            const res = await fetch(`/api/superadmin/users?search=${encodeURIComponent(query)}&limit=10`);
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users || data);
            }
        } catch (error) {
            console.error("Error searching users:", error);
        }
    };

    const handleCreate = async (formData: FormData) => {
        const userId = formData.get("userId") as string;
        const profileId = formData.get("profileId") as string;
        const customSlug = formData.get("customSlug") as string;

        try {
            const res = await fetch("/api/superadmin/referrals/assignments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    profileId,
                    customSlug: customSlug || undefined
                }),
            });

            if (res.ok) {
                setCreateOpen(false);
                fetchData();
            } else {
                const error = await res.json();
                alert(error.error || "Error creating assignment");
            }
        } catch (error) {
            console.error("Error creating assignment:", error);
        }
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(`${window.location.origin}/ref/${code}`);
    };

    const formatCurrency = (amount: string) => {
        return new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN"
        }).format(parseFloat(amount));
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
                    <h1 className="text-2xl font-bold">Asignaciones de Referido</h1>
                    <p className="text-muted-foreground">
                        Gestiona los códigos de referido asignados a usuarios
                    </p>
                </div>
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Nueva Asignación
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Crear Asignación de Referido</DialogTitle>
                        </DialogHeader>
                        <form action={handleCreate} className="space-y-4">
                            <div>
                                <Label htmlFor="userSearch">Buscar Usuario</Label>
                                <Input
                                    id="userSearch"
                                    placeholder="Buscar por email..."
                                    value={userSearch}
                                    onChange={(e) => {
                                        setUserSearch(e.target.value);
                                        searchUsers(e.target.value);
                                    }}
                                />
                                {users.length > 0 && (
                                    <div className="mt-2 border rounded-md max-h-40 overflow-auto">
                                        {users.map((user) => (
                                            <button
                                                key={user.id}
                                                type="button"
                                                className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                                                onClick={() => {
                                                    const input = document.getElementById("userId") as HTMLInputElement;
                                                    input.value = user.id;
                                                    setUserSearch(user.email);
                                                    setUsers([]);
                                                }}
                                            >
                                                {user.name || user.email}
                                                <span className="text-muted-foreground ml-2">{user.email}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <input type="hidden" id="userId" name="userId" required />
                            </div>
                            <div>
                                <Label htmlFor="profileId">Perfil</Label>
                                <Select name="profileId" required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar perfil" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {profiles.map((profile) => (
                                            <SelectItem key={profile.id} value={profile.id}>
                                                {profile.name} ({profile.type === "AFFILIATE" ? "Afiliado" : "Cliente"})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="customSlug">Slug Personalizado (opcional)</Label>
                                <Input
                                    id="customSlug"
                                    name="customSlug"
                                    placeholder="mi-codigo-personal"
                                    pattern="[a-z0-9-]+"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Solo letras minúsculas, números y guiones
                                </p>
                            </div>
                            <Button type="submit" className="w-full">
                                Crear Asignación
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Todas las Asignaciones</CardTitle>
                </CardHeader>
                <CardContent>
                    {assignments.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                            No hay asignaciones aún
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Usuario</TableHead>
                                    <TableHead>Perfil</TableHead>
                                    <TableHead>Código</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Clics</TableHead>
                                    <TableHead className="text-right">Referidos</TableHead>
                                    <TableHead className="text-right">Convertidos</TableHead>
                                    <TableHead className="text-right">Ganancias</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assignments.map((assignment) => (
                                    <TableRow key={assignment.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">
                                                    {assignment.user.name || "Sin nombre"}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {assignment.user.email}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={assignment.profile.type === "AFFILIATE" ? "default" : "secondary"}>
                                                {assignment.profile.name}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <code className="text-sm bg-muted px-2 py-1 rounded">
                                                {assignment.customSlug || assignment.referralCode}
                                            </code>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={assignment.status === "ACTIVE" ? "default" : "secondary"}
                                            >
                                                {assignment.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {assignment.totalClicks}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {assignment.totalReferrals}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {assignment.totalConverted}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatCurrency(assignment.totalEarned)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => copyCode(assignment.customSlug || assignment.referralCode)}
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    asChild
                                                >
                                                    <a
                                                        href={`/ref/${assignment.customSlug || assignment.referralCode}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
