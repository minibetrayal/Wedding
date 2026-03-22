export const GUESTBOOK_AUTOMODERATION_REASON_PREFIX = 'Automatic moderation: ';

/**
 * Common TLDs for bare-domain detection (after stripping obvious emails).
 * Extend if your guests often mention other suffixes.
 */
const BARE_DOMAIN_RE =
    /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|org|net|edu|gov|io|co|uk|au|nz|de|fr|ca)\b/i;

/** Word-boundary matches; extend or trim for your tone. */
const PROFANITY_WORDS = [
    'arse',
    'asshole',
    'bastard',
    'bitch',
    'bloody',
    'bollocks',
    'bullshit',
    'cock',
    'crap',
    'cunt',
    'damn',
    'dick',
    'fuck',
    'piss',
    'shit',
    'slut',
    'twat',
    'whore',
];

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsProfanity(text: string): boolean {
    const t = text.toLowerCase();
    for (const word of PROFANITY_WORDS) {
        const re = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i');
        if (re.test(t)) return true;
    }
    return false;
}

function containsUrl(text: string): boolean {
    if (/https?:\/\/\S+/i.test(text)) return true;
    if (/\bwww\.\S+/i.test(text)) return true;
    const withoutEmails = text.replace(/\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, ' ');
    return BARE_DOMAIN_RE.test(withoutEmails);
}

/** True when a long stretch is mostly uppercase (shouting). */
function excessiveCaps(text: string): boolean {
    let alpha = 0;
    let upper = 0;
    for (const ch of text) {
        if (/[a-zA-Z]/.test(ch)) {
            alpha += 1;
            if (ch >= 'A' && ch <= 'Z') upper += 1;
        }
    }
    if (alpha < 15) return false;
    return upper / alpha >= 0.65;
}

export type GuestbookAutomoderationResult = {
    shouldModerate: boolean;
    reasons: string[];
};

export function evaluateGuestbookAutomoderation(
    displayName: string,
    content: string
): GuestbookAutomoderationResult {
    const combined = [displayName, content].filter((s) => s.length > 0).join('\n');
    const reasons: string[] = [];
    if (containsProfanity(combined)) {
        reasons.push('language may not be suitable for the guestbook');
    }
    if (containsUrl(combined)) {
        reasons.push('URLs are not allowed');
    }
    if (excessiveCaps(combined)) {
        reasons.push('excessive use of capital letters');
    }
    return { shouldModerate: reasons.length > 0, reasons };
}

export function formatAutomoderationReason(reasons: string[]): string {
    const body = reasons.join('; ');
    return `${GUESTBOOK_AUTOMODERATION_REASON_PREFIX}${body}`;
}

export function isGuestbookAutomaticModerationReason(reason?: string): boolean {
    return typeof reason === 'string' && reason.startsWith(GUESTBOOK_AUTOMODERATION_REASON_PREFIX);
}
