
"use client";

import React, { useEffect, useState } from "react";
import { X, Youtube, Video, Loader2, Plus, Play, List } from "lucide-react";

interface VideoItem {
    id: string;
    title: string;
    thumbnail: string;
    duration: number; // seconds
}

interface Playlist {
    id: string;
    title: string;
    count: number;
}

interface VideoPickerProps {
    onClose: () => void;
    onSelect: (video: VideoItem & { provider: 'youtube' | 'vimeo' }) => void;
}

export default function VideoPicker({ onClose, onSelect }: VideoPickerProps) {
    const [provider, setProvider] = useState<'youtube' | 'vimeo'>('youtube');
    const [videos, setVideos] = useState<VideoItem[]>([]);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingPlaylists, setLoadingPlaylists] = useState(false);
    const [nextPageToken, setNextPageToken] = useState<string | null>(null);
    const [page, setPage] = useState(1);

    const fetchPlaylists = async () => {
        setLoadingPlaylists(true);
        try {
            const res = await fetch(`/api/cloud/playlists?provider=${provider}`);
            const data = await res.json();
            if (data.items) {
                setPlaylists(data.items);
            } else {
                setPlaylists([]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingPlaylists(false);
        }
    };

    const fetchVideos = async (reset = false) => {
        setLoading(true);
        try {
            let url = `/api/cloud/videos?provider=${provider}&page=${reset ? 1 : page}`;
            if (selectedPlaylist) url += `&playlistId=${selectedPlaylist}`;
            if (!reset && nextPageToken) url += `&pageToken=${nextPageToken}`;

            const res = await fetch(url);
            const data = await res.json();

            if (data.items) {
                if (reset) {
                    setVideos(data.items);
                } else {
                    // Deduplicate items
                    setVideos(prev => {
                        const existingIds = new Set(prev.map(v => v.id));
                        const newItems = data.items.filter((v: VideoItem) => !existingIds.has(v.id));

                        console.log(`[VideoPicker] Fetched ${data.items.length} items. ${newItems.length} new, ${data.items.length - newItems.length} duplicates.`);

                        return [...prev, ...newItems];
                    });
                }
                setNextPageToken(data.nextPageToken || null);

                // Ensure page updates for Vimeo (or others using numeric pages)
                if (data.nextPage) {
                    setPage(data.nextPage);
                } else if (data.nextPageToken) {
                    // For token-based APIs (YouTube), we can just increment page strictly for UI/logic if needed, 
                    // though usually not required if we rely on token.
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Reset selection when provider changes
    useEffect(() => {
        setVideos([]);
        setPlaylists([]);
        setSelectedPlaylist(null);
        setPage(1);
        setNextPageToken(null);

        // Fetch playlists and initial Recents
        fetchPlaylists();
        fetchVideos(true);
    }, [provider]);

    // Re-fetch videos when playlist changes
    useEffect(() => {
        // Reset video list state before fetching new playlist to avoid confusion
        setVideos([]);
        setPage(1);
        setNextPageToken(null);
        fetchVideos(true);
    }, [selectedPlaylist]);

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-neutral-800 bg-neutral-900/50">
                    <div>
                        <h2 className="text-xl font-light">Agregar Video Externo</h2>
                        <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">Busca en tus cuentas conectadas de YouTube o Vimeo</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full transition">
                        <X className="w-5 h-5 text-neutral-400" />
                    </button>
                </div>

                {/* Provider Tabs */}
                <div className="flex gap-4 p-6 pb-0">
                    <button
                        onClick={() => setProvider('youtube')}
                        className={`pb-4 px-2 text-sm font-medium border-b-2 transition flex items-center gap-2 ${provider === 'youtube'
                            ? 'border-red-600 text-white'
                            : 'border-transparent text-neutral-500 hover:text-white'
                            }`}
                    >
                        <Youtube className={`w-4 h-4 ${provider === 'youtube' ? 'text-red-500' : ''}`} />
                        YouTube
                    </button>
                    <button
                        onClick={() => setProvider('vimeo')}
                        className={`pb-4 px-2 text-sm font-medium border-b-2 transition flex items-center gap-2 ${provider === 'vimeo'
                            ? 'border-sky-500 text-white'
                            : 'border-transparent text-neutral-500 hover:text-white'
                            }`}
                    >
                        <Video className={`w-4 h-4 ${provider === 'vimeo' ? 'text-sky-500' : ''}`} />
                        Vimeo
                    </button>
                </div>

                {/* Playlist Filter */}
                <div className="flex px-6 pt-4 pb-2 gap-2 overflow-x-auto no-scrollbar items-center">
                    <button
                        onClick={() => setSelectedPlaylist(null)}
                        className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium border transition ${selectedPlaylist === null
                            ? 'bg-white text-black border-white'
                            : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:border-neutral-500'
                            }`}
                    >
                        Recientes (Todos)
                    </button>
                    {playlists.map(playlist => (
                        <button
                            key={playlist.id}
                            onClick={() => setSelectedPlaylist(playlist.id)}
                            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium border transition ${selectedPlaylist === playlist.id
                                ? 'bg-white text-black border-white'
                                : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:border-neutral-500'
                                }`}
                        >
                            {playlist.title} <span className="opacity-50 ml-1">({playlist.count})</span>
                        </button>
                    ))}
                    {loadingPlaylists && (
                        <div className="px-2 py-1.5 flex items-center">
                            <Loader2 className="w-3 h-3 animate-spin text-neutral-600" />
                        </div>
                    )}
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {videos.map((video, index) => (
                            <div
                                key={`${video.id}-${index}`}
                                onClick={() => onSelect({ ...video, provider })}
                                className="group cursor-pointer bg-neutral-800 rounded-xl overflow-hidden border border-neutral-700 hover:border-emerald-500 transition relative"
                            >
                                <div className="aspect-video relative">
                                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                                        <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition transform scale-75 group-hover:scale-100">
                                            <Plus className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                    <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-medium text-white">
                                        {video.duration ? formatDuration(video.duration) : '??:??'}
                                    </div>
                                </div>
                                <div className="p-3">
                                    <h3 className="text-xs font-medium text-neutral-300 line-clamp-2 leading-relaxed">
                                        {video.title}
                                    </h3>
                                </div>
                            </div>
                        ))}
                    </div>

                    {loading && (
                        <div className="flex justify-center py-10">
                            <Loader2 className="w-8 h-8 animate-spin text-neutral-600" />
                        </div>
                    )}

                    {!loading && videos.length === 0 && (
                        <div className="text-center py-20 text-neutral-500">
                            No se encontraron videos en esta lista.
                        </div>
                    )}

                    {nextPageToken && !loading && (
                        <div className="flex justify-center pt-8 pb-4">
                            <button
                                onClick={() => fetchVideos(false)}
                                className="px-6 py-2.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm font-medium transition flex items-center gap-2 border border-neutral-700"
                            >
                                Cargar más videos
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
