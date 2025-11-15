export type JSONCategory = 'sql' | 'nosql' | 'generic' | 'malformed';

export function classifyJsonForBackend(data: any): JSONCategory {
    try {
        if (data == null) return 'malformed';

        const isArray = Array.isArray(data);
        const sample = isArray ? data[0] : data;

        if (!sample || typeof sample !== 'object') return 'generic';

        const flatKeys = Object.keys(sample).every(
            key => typeof sample[key] !== 'object'
        );

        if (flatKeys) return 'sql';

        return 'nosql';
    } catch {
        return 'malformed';
    }
}
