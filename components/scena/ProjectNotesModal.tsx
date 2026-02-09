
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface ProjectNote {
    id: string;
    content: string;
    createdAt: string;
    user: {
        id: string;
        name: string | null;
        image: string | null;
        email: string;
    };
}

interface ProjectNotesModalProps {
    projectId: string;
    trigger?: React.ReactNode;
}

export function ProjectNotesModal({ projectId, trigger }: ProjectNotesModalProps) {
    const [notes, setNotes] = useState<ProjectNote[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [newNote, setNewNote] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const fetchNotes = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/scena/projects/${projectId}/notes`);
            if (res.ok) {
                const data = await res.json();
                setNotes(data);
            }
        } catch (error) {
            console.error("Failed to fetch notes:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchNotes();
        }
    }, [isOpen, projectId]);

    const handleSend = async () => {
        if (!newNote.trim()) return;
        setIsSending(true);
        try {
            const res = await fetch(`/api/scena/projects/${projectId}/notes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: newNote }),
            });

            if (res.ok) {
                const note = await res.json();
                setNotes((prev) => [note, ...prev]);
                setNewNote("");
            }
        } catch (error) {
            console.error("Failed to send note:", error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Notas
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0 gap-0 bg-slate-900 border-slate-800 text-slate-200">
                <DialogHeader className="p-4 border-b border-slate-800">
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-violet-400" />
                        Notas del Proyecto
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                    {isLoading && notes.length === 0 ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
                        </div>
                    ) : notes.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm">
                            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p>No hay notas aún.</p>
                            <p>Sé el primero en escribir algo.</p>
                        </div>
                    ) : (
                        notes.map((note) => (
                            <div key={note.id} className="flex gap-3 relative group">
                                <Avatar className="w-8 h-8 border border-white/10">
                                    <AvatarImage src={note.user.image || undefined} />
                                    <AvatarFallback>{note.user.name?.[0] || note.user.email[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-sm font-medium text-slate-200">
                                            {note.user.name || note.user.email}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true, locale: es })}
                                        </span>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-3 text-sm text-slate-300 border border-white/5">
                                        <p className="whitespace-pre-wrap">{note.content}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                    <div className="flex gap-2">
                        <Textarea
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="Escribe una nota..."
                            className="min-h-[40px] max-h-[120px] bg-slate-800 border-slate-700 resize-none focus-visible:ring-violet-500"
                            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                        />
                        <Button
                            size="icon"
                            disabled={!newNote.trim() || isSending}
                            onClick={handleSend}
                            className="bg-violet-600 hover:bg-violet-500 shrink-0"
                        >
                            {isSending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
