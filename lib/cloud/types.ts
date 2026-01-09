export interface CloudFile {
    id: string;
    name: string;
    mimeType: string;
    thumbnailLink?: string; // Small size for grid
    previewLink?: string;   // Larger size for lightbox
    downloadLink?: string;  // For downloading
    width?: number;
    height?: number;
    lastModified?: string;
}

export interface CloudFolder {
    id: string;
    name: string;
}

export interface CloudProvider {
    /**
     * The unique identifier of the provider (e.g., "google", "dropbox")
     */
    providerId: string;

    /**
     * List files in a specific folder.
     * Authentication is handled internally by the implementation using the passed tokens.
     */
    listFiles(folderId: string, accessToken: string): Promise<CloudFile[]>;

    /**
     * List subfolders in a specific folder (for navigation/setup).
     */
    listFolders(folderId: string, accessToken: string): Promise<CloudFolder[]>;

    /**
     * Get a public or temporary link for a specific file.
     */
    getFileLink(fileId: string, accessToken: string): Promise<string>;
}
