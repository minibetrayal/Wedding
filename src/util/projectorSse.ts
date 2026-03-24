import type { Request, Response } from 'express';

import { getDataConnection as dataConnection } from '../data/def/DataConnection';
import type { ProjectorMode } from '../data/def/types/Projector';

const clients = new Set<Response>();
setInterval(() => {
    for (const client of clients) {
        try {
            client.write('event: ping\n\n');
        } catch {
            clients.delete(client);
        }
    }
}, 25_000);

export async function broadcast() {
    const projector = await dataConnection().projector.get();
    const entryIds = await dataConnection().projector.getGuestbookEntryIds();
    const state = {
        mode: projector.mode,
        message: projector.message,
        dwellMs: projector.dwellMs,
        paused: projector.paused,
        entryIds,
    };
    const line = `event: state\ndata: ${JSON.stringify(state)}\n\n`;
    for (const client of clients) {
        try {
            client.write(line);
        } catch {
            clients.delete(client);
        }
    }
}

export async function connect(req: Request, res: Response): Promise<void> {
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
    });
    res.status(200);
    res.flushHeaders();
    clients.add(res);
    await broadcast();

    const detach = (): boolean => clients.delete(res);
    req.on('close', detach);
    req.on('aborted', detach);
}
