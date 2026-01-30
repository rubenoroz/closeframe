export interface MediaItem {
    id: string;
    url: string;
    thumbnailUrl?: string;
    name: string;
    width?: number;
    height?: number;
    isVideo: boolean;
    provider: "drive" | "youtube" | "vimeo";
    providerId?: string; // Original ID from provider
    duration?: number; // seconds
}

export interface Moment {
    id: string; // Folder ID
    name: string;
    items: MediaItem[];
    order: number;
}

export interface CloserGalleryStructure {
    moments: Moment[];
    highlights: MediaItem[]; // Items at root
    totalItems: number;
}
