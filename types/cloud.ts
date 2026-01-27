
export interface CloudFile {
    id: string;
    name: string;
    mimeType: string;
    thumbnailLink?: string;
    webContentLink?: string;
    size?: string;
    modifiedTime?: string;
    imageMediaMetadata?: {
        width: number;
        height: number;
    };
    videoMediaMetadata?: {
        width: number;
        height: number;
        durationMillis: number;
    };
    width?: number;
    height?: number;
    formats?: {
        web: string;
        jpg?: string | null;
        hd?: string | null;
        raw?: string | { id: string; name: string } | null;
        [key: string]: any;
    };
}
