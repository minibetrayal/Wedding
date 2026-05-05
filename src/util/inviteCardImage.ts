import fs from 'fs';
import path from 'path';

import sharp from 'sharp';

/** Physical square size when pasted into Word (PNG pHYs / DPI metadata). */
export const INVITE_CARD_CM = 8;

/** Pixel dimensions (square). Keep in sync with DPI embedding below. */
export const INVITE_CARD_PX = 2000;

export type InviteCardContent = {
    inviteName: string;
    inviteLine: string;
    namesLine: string;
    dateLine: string;
    qrUrl: string;
    urlLine: string;
    inviteId: string;
};

/** Options for `renderInviteCardPng` (e.g. admin toner-transfer tooling). */
export type InviteCardRenderOptions = {
    /** Horizontal mirror for toner transfer. */
    flip?: boolean;
    /** Draw circular boundary guide touching square edges. */
    circle?: boolean;
};

const BLACK = '#000000';
const WHITE = '#ffffff';

interface GlyphPosition {
    xAdvance: number;
    yAdvance: number;
    xOffset: number;
    yOffset: number;
}

interface GlyphRef {
    id: number;
}

interface GlyphRun {
    glyphs: GlyphRef[];
    positions: GlyphPosition[];
    advanceWidth: number;
}

interface GlyphPath {
    commands: unknown[];
    toSVG(): string;
}

interface FontkitGlyph {
    path: GlyphPath;
}

interface FontkitFont {
    unitsPerEm: number;
    ascent: number;
    descent: number;
    layout(text: string): GlyphRun;
    getGlyph(id: number): FontkitGlyph;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports -- fontkit ships without TS types
const fontkitOpenSync = require('fontkit').openSync as (path: string) => FontkitFont;

function resolveFontsDir(): string {
    const candidates = [
        path.join(__dirname, '..', '..', 'public', 'fonts'),
        path.join(process.cwd(), 'public', 'fonts'),
    ];
    for (const dir of candidates) {
        if (fs.existsSync(path.join(dir, 'GreatVibes-Regular.ttf'))) {
            return path.resolve(dir);
        }
    }
    return path.resolve(candidates[0]);
}

const FONTS_DIR = resolveFontsDir();
const GREAT_VIBES = path.join(FONTS_DIR, 'GreatVibes-Regular.ttf');
const PLAYFAIR_BOLD = path.join(FONTS_DIR, 'PlayfairDisplay-Bold.ttf');
const CASCADIA_REGULAR = path.join(FONTS_DIR, 'CascadiaCode-Regular.ttf');

let fontsCache: { great: FontkitFont; playfair: FontkitFont; code: FontkitFont } | null = null;

function loadFonts(): { great: FontkitFont; playfair: FontkitFont; code: FontkitFont } {
    if (fontsCache) {
        return fontsCache;
    }
    if (!fs.existsSync(GREAT_VIBES)) {
        throw new Error(`Missing font file: ${GREAT_VIBES}`);
    }
    if (!fs.existsSync(PLAYFAIR_BOLD)) {
        throw new Error(`Missing font file: ${PLAYFAIR_BOLD}`);
    }
    if (!fs.existsSync(CASCADIA_REGULAR)) {
        throw new Error(`Missing font file: ${CASCADIA_REGULAR}`);
    }
    const great = fontkitOpenSync(GREAT_VIBES);
    const playfair = fontkitOpenSync(PLAYFAIR_BOLD);
    const code = fontkitOpenSync(CASCADIA_REGULAR);
    fontsCache = { great, playfair, code };
    return fontsCache;
}

function fmt(n: number): string {
    const r = Math.round(n * 1000) / 1000;
    return Number.isInteger(r) ? String(r) : r.toFixed(3).replace(/\.?0+$/, '');
}

/** Boundary circle touching square edges (optional via `circle` render flag). */
function devBoundaryCircleSvg(px: number, centerX: number): string {
    const rCircle = px / 2;
    return `<circle cx="${fmt(centerX)}" cy="${fmt(centerX)}" r="${fmt(rCircle)}" fill="none" stroke="${BLACK}" stroke-width="1"/>`;
}

/**
 * Renders a single horizontal line, visually aligned so top ≈ yTop; returns bottom Y (SVG coords).
 * Optional letterSpacingPx adds tracking between glyphs (like CSS letter-spacing), without inserting space characters.
 */
function appendCenteredRun(
    parts: string[],
    font: FontkitFont,
    text: string,
    fontSize: number,
    centerX: number,
    yTop: number,
    letterSpacingPx = 0,
): number {
    const run = font.layout(text);
    const scale = fontSize / font.unitsPerEm;
    const n = run.glyphs.length;
    const trackingFontUnits =
        letterSpacingPx > 0 && n > 1 ? (letterSpacingPx * font.unitsPerEm) / fontSize : 0;
    const totalAdvanceFont = run.advanceWidth + (n > 1 ? (n - 1) * trackingFontUnits : 0);
    const totalW = totalAdvanceFont * scale;
    const left = centerX - totalW / 2;
    const baselineY = yTop + font.ascent * scale;

    parts.push(
        `<g transform="translate(${fmt(left)},${fmt(baselineY)}) scale(${fmt(scale)},${fmt(-scale)})">`,
    );

    let penX = 0;
    for (let i = 0; i < run.glyphs.length; i++) {
        const pos = run.positions[i];
        const gRef = run.glyphs[i];
        const gx = penX + pos.xOffset;
        const gy = pos.yOffset;
        const glyph = font.getGlyph(gRef.id);
        if (glyph.path.commands.length > 0) {
            const d = glyph.path.toSVG();
            parts.push(`<path fill="${BLACK}" transform="translate(${fmt(gx)},${fmt(gy)})" d="${d}"/>`);
        }
        penX += pos.xAdvance;
        if (letterSpacingPx > 0 && i < run.glyphs.length - 1) {
            penX += trackingFontUnits;
        }
    }
    parts.push('</g>');

    return baselineY + Math.abs(font.descent) * scale;
}

function pngWithEmbeddedDpi(pngBuffer: Buffer, dpi: number): Buffer {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { changeDpiDataUrl } = require('changedpi') as {
        changeDpiDataUrl: (dataUrl: string, dpi: number) => string;
    };
    const dataUrl = `data:image/png;base64,${pngBuffer.toString('base64')}`;
    const updated = changeDpiDataUrl(dataUrl, dpi);
    const comma = updated.indexOf(',');
    return Buffer.from(updated.slice(comma + 1), 'base64');
}

export async function renderInviteCardPng(
    content: InviteCardContent,
    options?: InviteCardRenderOptions,
): Promise<Buffer> {
    const flip = options?.flip === true;
    const circle = options?.circle === true;

    const { great, playfair, code } = loadFonts();

    const px = INVITE_CARD_PX;
    const centerX = px / 2;
    const qrSize = px / 2;

    const qrRes = await fetch(content.qrUrl, { signal: AbortSignal.timeout(20_000) });
    if (!qrRes.ok) {
        throw new Error(`QR image request failed (${qrRes.status})`);
    }
    const qrBuf = Buffer.from(await qrRes.arrayBuffer());
    const qrB64 = qrBuf.toString('base64');

    const bodyParts: string[] = [];

    const gapSm = 15;
    const gapMd = 30;
    let y = 0;
    let extentBottom = 0;

    const recordExtent = (bottom: number) => {
        extentBottom = Math.max(extentBottom, bottom);
    };

    y += gapMd;

    recordExtent((y = appendCenteredRun(bodyParts, great, content.inviteName, 150, centerX, y)));
    y += gapSm;

    recordExtent((y = appendCenteredRun(bodyParts, playfair, content.inviteLine, 50, centerX, y)));
    y += gapMd;

    recordExtent((y = appendCenteredRun(bodyParts, playfair, content.namesLine, 130, centerX, y)));
    y += gapMd;

    recordExtent((y = appendCenteredRun(bodyParts, playfair, content.dateLine, 43, centerX, y, 8)));
    y += gapMd;

    const qrX = (px - qrSize) / 2;
    bodyParts.push(
        `<image href="data:image/png;base64,${qrB64}" width="${fmt(qrSize)}" height="${fmt(qrSize)}" x="${fmt(qrX)}" y="${fmt(y)}" preserveAspectRatio="xMidYMid meet"/>`,
    );
    recordExtent(y + qrSize);
    y += qrSize + gapMd;

    recordExtent((y = appendCenteredRun(bodyParts, playfair, content.urlLine, 60, centerX, y)));
    y += gapSm;

    recordExtent(appendCenteredRun(bodyParts, code, content.inviteId, 50, centerX, y, 16));

    const contentHeight = extentBottom;
    const bodyOffsetY = (px - contentHeight) / 2;
    const bodyGroup = `<g transform="translate(0,${fmt(bodyOffsetY)})">\n${bodyParts.join('\n')}\n</g>`;

    const innerFragments = [
        `<rect width="${px}" height="${px}" fill="${WHITE}"/>`,
        bodyGroup,
        ...(circle ? [devBoundaryCircleSvg(px, centerX)] : []),
    ];
    const inner = innerFragments.join('\n');

    /** Horizontal mirror (SVG applies transforms right-to-left: flip then shift back into view). */
    const scene = flip ? `<g transform="translate(${fmt(px)},0) scale(-1,1)">\n${inner}\n</g>` : inner;

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}">
${scene}
</svg>`;

    const rawPng = await sharp(Buffer.from(svg, 'utf8')).png().toBuffer();
    const dpi = Math.round(INVITE_CARD_PX / (INVITE_CARD_CM / 2.54));
    return pngWithEmbeddedDpi(rawPng, dpi);
}
