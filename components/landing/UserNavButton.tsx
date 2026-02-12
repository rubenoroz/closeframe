
"use client";

import Link from "next/link";
import { User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "next-auth/react";

interface UserNavButtonProps {
    user?: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
    } | null;
}

export function UserNavButton({ user }: UserNavButtonProps) {
    if (!user) {
        return (
            <div className="flex items-center gap-4">
                <Link
                    href="/login"
                    className="bg-white text-black px-5 py-2 rounded-full text-xs font-bold tracking-widest uppercase hover:bg-[#cdb8e1] transition-all"
                >
                    LOGIN
                </Link>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-4">
            <Link
                href="/dashboard"
                className="hidden md:block text-sm font-medium hover:text-[#cdb8e1] transition-colors"
            >
                Ir al Dashboard
            </Link>
            <DropdownMenu>
                <DropdownMenuTrigger className="outline-none">
                    <Avatar className="h-9 w-9 border border-white/20 transition-all hover:border-[#cdb8e1]">
                        <AvatarImage src={user.image || ""} alt={user.name || ""} />
                        <AvatarFallback className="bg-neutral-800 text-white">
                            {user.name?.charAt(0) || <User className="h-4 w-4" />}
                        </AvatarFallback>
                    </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-black border border-white/10 text-white">
                    <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-white cursor-pointer">
                        <Link href="/dashboard">Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-white cursor-pointer">
                        <Link href="/dashboard/settings">Configuración</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="text-red-400 focus:bg-red-400/10 focus:text-red-400 cursor-pointer"
                        onClick={() => signOut({ callbackUrl: "/" })}
                    >
                        Cerrar Sesión
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
