/**
 * Turns a camelCase identifier into a title-cased phrase, e.g. `islandFerry` → "Island Ferry".
 */
export function camelToTitleCase(value: string): string {
    const spaced = value.replace(/([A-Z])/g, ' $1').trim();
    return spaced
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}
