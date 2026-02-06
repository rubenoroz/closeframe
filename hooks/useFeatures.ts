
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useFeatures() {
    const { data, error, isLoading, mutate } = useSWR('/api/features/me', fetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 60000 // 1 minute
    });

    const canUse = (featureKey: string): boolean => {
        if (!data?.features) return false;
        const val = data.features[featureKey];
        return !!val;
    };

    const getLimit = (featureKey: string): number | null => {
        if (!data?.features) return null;
        const val = data.features[featureKey];
        return typeof val === 'number' ? val : null;
    };

    return {
        features: data?.features || {},
        role: data?.role,
        isLoading,
        error,
        canUse,
        getLimit,
        refreshFeatures: mutate
    };
}
