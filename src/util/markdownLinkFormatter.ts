export function formatMarkdownLinks(text: string): string {
    return text
        .replace(/(?:\[(.*?)\])?\((.*?)\)/g, (_m, label: string | undefined, url: string) => {
            const display = label != null && label.trim() !== '' ? label : url;
            return `<a class="link-primary" href="${url}">${display}</a>`;
        })
        .replace(/\n/g, '<br>');
}