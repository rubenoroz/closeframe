import { CloudFile, CloudFolder, CloudProvider } from "./types";

export class MockCloudProvider implements CloudProvider {
    providerId = "mock";

    async listFiles(folderId: string, accessToken: string): Promise<CloudFile[]> {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Return mock images
        return [
            {
                id: "file-1",
                name: "Morning Hike.jpg",
                mimeType: "image/jpeg",
                thumbnailLink: "https://images.unsplash.com/photo-1502252437224-10d4ace285ab?q=80&w=600&auto=format&fit=crop",
                previewLink: "https://images.unsplash.com/photo-1502252437224-10d4ace285ab?q=80&w=2000&auto=format&fit=crop",
                width: 2000,
                height: 1333,
            },
            {
                id: "file-2",
                name: "Mountain View.jpg",
                mimeType: "image/jpeg",
                thumbnailLink: "https://images.unsplash.com/photo-1426604966848-d3ad1f6bdd59?q=80&w=600&auto=format&fit=crop",
                previewLink: "https://images.unsplash.com/photo-1426604966848-d3ad1f6bdd59?q=80&w=2000&auto=format&fit=crop",
                width: 2000,
                height: 1333,
            },
            {
                id: "file-3",
                name: "Forest Path.jpg",
                mimeType: "image/jpeg",
                thumbnailLink: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=600&auto=format&fit=crop",
                previewLink: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2000&auto=format&fit=crop",
                width: 2000,
                height: 1333,
            },
        ];
    }

    async listFolders(folderId: string, accessToken: string): Promise<CloudFolder[]> {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return [
            { id: "folder-1", name: "Weddings" },
            { id: "folder-2", name: "Portraits" },
        ];
    }

    async getFileLink(fileId: string, accessToken: string): Promise<string> {
        return `https://mock.com/download/${fileId}`;
    }
}
