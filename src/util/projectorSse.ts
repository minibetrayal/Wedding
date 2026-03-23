import type { Request, Response } from 'express';

import { database } from '../data/tempConnection';
import type { ProjectorMode } from '../data/types/Projector';

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
    const projector = await database.projector.get();
    const entryIds = await database.projector.getGuestbookEntryIds();
    const state = {
        mode: projector.mode,
        message: projector.message,
        dwellMs: projector.dwellMs,
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
