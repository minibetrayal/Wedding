export function normalizeArray<T>(array: T[] | T | undefined): T[] {
    if (!array) return [];
    return Array.isArray(array) ? array : [array as T];
}