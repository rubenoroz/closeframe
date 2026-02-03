import { z } from 'zod';

export const PlanConfigSchema = z.object({
    features: z.object({
        collaborativeGalleries: z.boolean().optional(),
        // Add other feature flags as needed
        videoUploads: z.boolean().optional(),
        customBranding: z.boolean().optional(),
    }).optional(),
    limits: z.object({
        maxStorageBytes: z.number().optional(),
        maxProjects: z.number().optional(),
    }).optional(),
});

export type PlanConfig = z.infer<typeof PlanConfigSchema>;

export function parsePlanConfig(config: unknown): PlanConfig {
    const result = PlanConfigSchema.safeParse(config);
    if (!result.success) {
        console.warn('Invalid plan config:', result.error);
        return {};
    }
    return result.data;
}
