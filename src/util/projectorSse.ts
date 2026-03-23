import type { Request, Response } from 'express';

import { database } from '../data/tempConnection';
import type { ProjectorMode } from '../data/types/Projector';

export type ProjectorSseState = {
    mode: ProjectorMode;
    message: string;
    dwellMs: number;
    entryIds: string[];
};

const clients = new Set<Response>();

let heartbeatStarted = false;

export async function getProjectorSseState(): Promise<ProjectorSseState> {
    const projector = await database.projector.get();
    const entryIds = await database.projector.getGuestbookEntryIds();
    return {
        mode: projector.mode,
        message: projector.message,
        dwellMs: projector.dwellMs,
        entryIds,
    };
}

function writeSseEvent(res: Response, event: string, payload: unknown): void {
    const line = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    res.write(line);
}

function startHeartbeatIfNeeded(): void {
    if (heartbeatStarted) return;
    heartbeatStarted = true;
    const intervalMs = 25_000;
    setInterval(() => {
        for (const res of clients) {
            try {
                res.write(': ping\n\n');
            } catch {
                clients.delete(res);
            }
        }
    }, intervalMs);
}

/**
 * Push current projector settings to every connected `/projector/stream` client.
 * Safe to call after guestbook or projector mutations; failures are logged only.
 */
export async function broadcastProjectorState(): Promise<void> {
    if (clients.size === 0) return;
    const state = await getProjectorSseState();
    for (const res of clients) {
        try {
            writeSseEvent(res, 'state', state);
        } catch {
            clients.delete(res);
        }
    }
}

export function scheduleProjectorBroadcast(): void {
    void broadcastProjectorState().catch((err) => {
        if (process.env.NODE_ENV === 'development') {
            console.error('projector SSE broadcast failed', err);
        }
    });
}

/** Attach a long-lived SSE response; sends initial `state` then receives broadcasts. */
export async function openProjectorSseStream(req: Request, res: Response): Promise<void> {
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
    });
    res.status(200);
    if (typeof (res as Response & { flushHeaders?: () => void }).flushHeaders === 'function') {
        (res as Response & { flushHeaders: () => void }).flushHeaders();
    }

    const initial = await getProjectorSseState();
    writeSseEvent(res, 'state', initial);

    clients.add(res);
    startHeartbeatIfNeeded();

    const detach = (): void => {
        clients.delete(res);
    };
    req.on('close', detach);
    req.on('aborted', detach);
}
