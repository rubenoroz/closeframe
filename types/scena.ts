import { ScenaProject, Column, Task, User, Filter } from "@prisma/client";

// Extended Column type with relations
export type FetchedColumn = Column & {
    tasks: FetchedTask[];
    color?: string | null;
    cardColor?: string | null;
};

// Extended Task type with all necessary fields from Prisma + extras for client
export type FetchedTask = Task & {
    // Relations
    children?: FetchedTask[];
    assignees?: Partial<User>[];

    // Client-side computed fields
    sortKey?: string;
    level?: number;

    // Ensure these fields are recognized (they exist in Prisma Task)
    title: string;
    description?: string | null;
    priority?: string | null;
    startDate?: Date | null;
    endDate?: Date | null;
    toleranceDate?: Date | null;
    progress: number;
    parentId?: string | null;
    isHiddenInGantt: boolean;
    isArchived?: boolean;
    color?: string | null;
    links?: string | null;
    attachments?: string | null;
    images?: any;
    tags?: any;
    checklist?: string | null;
};

export type FetchedProject = ScenaProject & {
    columns: FetchedColumn[];
};
