// Tipos para el sistema de Superadmin

export type UserRole = "USER" | "VIP" | "STAFF" | "SUPERADMIN";

export interface Plan {
    id: string;
    name: string;
    displayName: string;
    description?: string | null;
    price: number;
    currency: string;
    interval: "month" | "year";
    features: string[];
    limits: PlanLimits;
    isActive: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface PlanLimits {
    maxProjects: number;
    maxCloudAccounts: number;
    // Descargas ZIP
    zipDownloadsEnabled: boolean;
    maxZipDownloadsPerMonth: number | null; // null = ilimitado
    // Funcionalidades
    watermarkRemoval: boolean;
    customBranding: boolean; // Logo personalizado en galerías
    passwordProtection: boolean; // Proteger galerías con contraseña
    // Soporte
    prioritySupport: boolean;

    // NUEVOS - Plan Free restrictions
    maxImagesPerProject: number | null;  // null = ilimitado, Free = 20
    videoEnabled: boolean;               // false = no video en galerías
    maxSocialLinks: number;              // 1 = solo Instagram, -1 = ilimitado
    lowResThumbnails: boolean;           // true = thumbnails baja calidad
    lowResDownloads: boolean;            // true = descargas en baja resolución
    lowResMaxWidth: number;              // max width para baja resolución (1200)
    bioMaxLength: number | null;         // null = ilimitado, Free = 150
    watermarkText: string | null;        // null = sin marca, "CloserLens" para Free
}

export interface UserWithPlan {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    role: UserRole;
    planId: string | null;
    planExpiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    plan?: Plan | null;
    _count?: {
        projects: number;
        bookings: number;
        cloudAccounts: number;
    };
}

export interface SuperadminStats {
    totalUsers: number;
    activeUsers: number; // Últimos 30 días
    totalProjects: number;
    totalCloudAccounts: number;
    totalBookings: number;
    usersByRole: {
        USER: number;
        ADMIN: number;
        SUPERADMIN: number;
    };
    usersByPlan: {
        planName: string;
        count: number;
    }[];
    recentUsers: {
        id: string;
        name: string | null;
        email: string;
        createdAt: Date;
    }[];
}

// Tipos para filtros y paginación
export interface PaginationParams {
    page: number;
    limit: number;
}

export interface UserFilters {
    search?: string;
    role?: UserRole;
    planId?: string;
}
