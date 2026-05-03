import type { Request, Response } from 'express';

import { getDataConnection as dataConnection } from '../data/def/DataConnection';
import { addRecentGuestbookEntryId } from '../routes/admin/admin-projector';

const clients = new Set<Response>();

// detach client from clients set
function detach(client: Response) {
    clients.delete(client);
}

// send event to client
function send(client: Response, event: string, data?: any) {
    let line = `event: ${event}`;
    if (data !== undefined) {
        line += `\ndata: ${JSON.stringify(data)}`;
    }
    line += '\n\n';
    try {
        client.write(line);
    } catch {
        detach(client);
    }
}

// send event to all clients
function sendAll(event: string, data?: any) {
    for (const client of clients) {
        send(client, event, data);
    }
}

const entryDisplayMap = new Map<string, number>();
let updateTimeout: NodeJS.Timeout | undefined;
let lastEntryId: string | undefined;
let previousBroadcastTime: number = 0;
let initialized: boolean = false;

export async function init(): Promise<void> {
    if (initialized) return;
    initialized = true;

    setInterval(() => sendAll('ping'), 25_000);
    await sendUpdate();

    // every ten minutes, purge any deleted entries
    setInterval(async () => {
        const allEntries = await dataConnection().guestbook.getAll();
        for (const entryId of [...entryDisplayMap.keys()]) {
            if (!allEntries.some(e => e.id === entryId)) {
                entryDisplayMap.delete(entryId);
            }
        }
    }, 10 * 60 * 1000);
}

// get next entry id to display on projector
async function nextEntryId(): Promise<string> {
    const entryIds = await dataConnection().projector.getGuestbookEntryIds();

    if (entryIds.length === 0) return '';

    const weights = entryIds.map(id => 1 / (entryDisplayMap.get(id) ?? 1));
    const total = weights.reduce((a, b) => a + b, 0);

    let nextEntryId = lastEntryId || entryIds[0];
    while (entryIds.length > 1 && lastEntryId === nextEntryId) {
        let r = Math.random() * total;
        for (let i = 0; i < entryIds.length; i++) {
            r -= weights[i];
            if (r <= 0) {
                nextEntryId = entryIds[i];
                break;
            }
        }
    }
    lastEntryId = nextEntryId;
    const result = nextEntryId!;
    entryDisplayMap.set(result, (entryDisplayMap.get(result) ?? 1) + 1);
    return result;
}

// cancel update timeout
function cancelUpdate(): void {
    if (updateTimeout) {
        clearTimeout(updateTimeout);
        updateTimeout = undefined;
    }
}

// send update to all clients
async function sendUpdate(entryId?: string): Promise<void> {
    cancelUpdate();
    const projector = await dataConnection().projector.get();
    if (projector.mode !== 'guestbook') return;
    if (projector.paused) return;

    lastEntryId = entryId ?? await nextEntryId();
    sendAll('entry', lastEntryId);
    addRecentGuestbookEntryId(lastEntryId);
    previousBroadcastTime = Date.now();
    updateTimeout = setTimeout(sendUpdate, projector.dwellMs);
}

async function updateCount(): Promise<void> {
    const entries = await dataConnection().projector.getGuestbookEntryIds();
    sendAll('count', entries.length);
}

// connect client to projector
export async function connect(req: Request, res: Response): Promise<void> {
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
    });
    const projector = await dataConnection().projector.get();
    res.status(200);
    res.flushHeaders();
    clients.add(res);

    req.on('close', () => detach(res));
    req.on('aborted', () => detach(res));

    send(res, 'mode', projector.mode);
    send(res, 'darkMode', projector.darkMode);
    send(res, 'message', projector.message);
    send(res, 'entry', lastEntryId);
}

// set mode and send update to all clients
export async function broadcastMode(): Promise<void> {
    const projector = await dataConnection().projector.get();
    sendAll('mode', projector.mode);
    await sendUpdate();
}

// send message to all clients
export async function broadcastMessage(): Promise<void> {
    const projector = await dataConnection().projector.get();
    sendAll('message', projector.message);
}

// send dark mode to all clients
export async function broadcastDarkMode(): Promise<void> {
    const projector = await dataConnection().projector.get();
    sendAll('darkMode', projector.darkMode);
}

// send entry id to all clients for immediate display
export async function broadcastEntry(entryId: string): Promise<void> {
    await sendUpdate(entryId);
}

export async function skipEntry(): Promise<void> {
    await sendUpdate();
}

// set dwell time and send update to all clients
export async function broadcastDwell(): Promise<void> {
    const projector = await dataConnection().projector.get();
    cancelUpdate();
    const timeSinceLastBroadcast = Date.now() - previousBroadcastTime;
    if (timeSinceLastBroadcast < projector.dwellMs) {
        updateTimeout = setTimeout(sendUpdate, projector.dwellMs - timeSinceLastBroadcast);
    } else {
        updateTimeout = setTimeout(sendUpdate, projector.dwellMs);
    }
}

// set pause or unpause the guestbook display. unpausing immediately sends the next entry id.
export async function broadcastPaused(): Promise<void> {
    const projector = await dataConnection().projector.get();
    if (projector.paused) cancelUpdate();
    else await sendUpdate();
}

export async function entryUpdated(entryId: string, state: 'new' | 'removed' | 'updated'): Promise<void> {
    const entries = await dataConnection().projector.getGuestbookEntryIds();
    if (state === 'removed' && lastEntryId === entryId) await sendUpdate();
    else if (entries.length <= 1) await sendUpdate();
    await updateCount();
}