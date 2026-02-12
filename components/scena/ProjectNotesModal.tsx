
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
    onRead?: () => void;
}

export function ProjectNotesModal({ projectId, trigger, onRead }: ProjectNotesModalProps) {
    const [notes, setNotes] = useState<ProjectNote[]>([]);
    const [members, setMembers] = useState<{ id: string; name: string | null; email: string; image: string | null }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [newNote, setNewNote] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Mentions state
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionIndex, setMentionIndex] = useState(0);
    const [showMentions, setShowMentions] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Poll for unread count
        const fetchUnread = async () => {
            if (isOpen) return; // Don't poll while open (we read them)
            try {
                const res = await fetch(`/api/scena/projects/${projectId}/unread`);
                if (res.ok) {
                    const data = await res.json();
                    setUnreadCount(data.count);
                }
            } catch (e) {
                console.error(e);
            }
        };

        fetchUnread();
        const interval = setInterval(fetchUnread, 10000); // 10s poll

        return () => clearInterval(interval);
    }, [projectId, isOpen]);

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

    const markAsRead = async () => {
        setUnreadCount(0); // Optimistic update
        try {
            await fetch(`/api/scena/projects/${projectId}/notes`, {
                method: "PATCH"
            });
            if (onRead) onRead();
        } catch (error) {
            console.error("Failed to mark notes as read:", error);
        }
    };

    const fetchMembers = async () => {
        try {
            const res = await fetch(`/api/scena/projects/${projectId}/members`);
            if (res.ok) {
                const data = await res.json();
                // API returns { members: [], invitations: [] }
                // We need to extract the user object from the membership
                const activeMembers = data.members?.map((m: any) => m.user) || [];
                setMembers(activeMembers);
            }
        } catch (error) {
            console.error("Failed to fetch members:", error);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchNotes();
            fetchMembers();
            markAsRead();
        }
    }, [isOpen, projectId, unreadCount, onRead]);

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

    // Mentions Logic
    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setNewNote(value);

        const cursorPosition = e.target.selectionStart;
        const textBeforeCursor = value.slice(0, cursorPosition);
        const lastAt = textBeforeCursor.lastIndexOf("@");

        if (lastAt !== -1) {
            const query = textBeforeCursor.slice(lastAt + 1);
            // Check if there are spaces, meaning we are not typing a name anymore
            if (!query.includes(" ")) {
                setMentionQuery(query);
                setShowMentions(true);
                setMentionIndex(0);
                return;
            }
        }

        setShowMentions(false);
        setMentionQuery(null);
    };

    const filteredMembers = members.filter(member => {
        if (!mentionQuery) return true;
        const search = mentionQuery.toLowerCase();
        return (
            (member.name?.toLowerCase().includes(search)) ||
            (member.email.toLowerCase().includes(search))
        );
    });

    const insertMention = (member: typeof members[0]) => {
        if (!textareaRef.current) return;

        const value = newNote;
        const cursorPosition = textareaRef.current.selectionStart;
        const textBeforeCursor = value.slice(0, cursorPosition);
        const lastAt = textBeforeCursor.lastIndexOf("@");

        const textAfter = value.slice(cursorPosition);
        const prefix = value.slice(0, lastAt);

        const memberName = member.name || member.email.split('@')[0];
        const newValue = `${prefix}@${memberName} ${textAfter}`;

        setNewNote(newValue);
        setShowMentions(false);
        setMentionQuery(null);

        // Restore focus
        textareaRef.current.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showMentions && filteredMembers.length > 0) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setMentionIndex(i => (i + 1) % filteredMembers.length);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setMentionIndex(i => (i - 1 + filteredMembers.length) % filteredMembers.length);
            } else if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                insertMention(filteredMembers[mentionIndex]);
            } else if (e.key === "Escape") {
                setShowMentions(false);
            }
        } else if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Helper to highlight mentions in display
    const renderContent = (content: string) => {
        // Regex to match @Name including Spanish accents and spaces
        // \u00C0-\u00FF covers standard Latin-1 Supplement (accents)
        const parts = content.split(/(@[\w\s\u00C0-\u00FF]+)/g);
        return parts.map((part, i) => {
            if (part.startsWith('@')) {
                // Check if it looks like a valid mention (simple heuristic)
                return <span key={i} className="text-violet-400 font-semibold">{part}</span>;
            }
            return part;
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2 relative overflow-visible">
                        <MessageSquare className="w-4 h-4" />
                        Notas
                        {unreadCount > 0 && (
                            <span className="absolute top-0.5 right-0.5 flex h-3 w-3 z-50">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-neutral-900"></span>
                            </span>
                        )}
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
                                        <p className="whitespace-pre-wrap">{renderContent(note.content)}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-900/50 relative">
                    {/* Mentions Popup */}
                    {showMentions && filteredMembers.length > 0 && (
                        <div className="absolute bottom-full left-4 mb-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50">
                            <div className="p-2 text-xs font-medium text-slate-500 border-b border-slate-700">
                                Sugerencias
                            </div>
                            <ul className="max-h-48 overflow-y-auto">
                                {filteredMembers.map((member, index) => (
                                    <li
                                        key={member.id}
                                        className={`flex items-center gap-2 p-2 cursor-pointer transition-colors ${index === mentionIndex ? 'bg-violet-600/20 text-violet-200' : 'hover:bg-slate-700 text-slate-300'
                                            }`}
                                        onClick={() => insertMention(member)}
                                    >
                                        <Avatar className="w-6 h-6">
                                            <AvatarImage src={member.image || undefined} />
                                            <AvatarFallback className="text-[10px]">{member.name?.[0] || member.email[0]}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm truncate">{member.name || member.email}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Textarea
                            ref={textareaRef}
                            value={newNote}
                            onChange={handleInput}
                            onKeyDown={handleKeyDown}
                            placeholder="Escribe una nota... (@ para mencionar)"
                            className="min-h-[40px] max-h-[120px] bg-slate-800 border-slate-700 resize-none focus-visible:ring-violet-500"
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
