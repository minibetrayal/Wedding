export type ProjectorMode = 'home' | 'guestbook' | 'message';

export class Projector {
    mode: ProjectorMode;
    message: string = '';
    dwellMs: number = 30_000;
    paused: boolean = false;
    darkMode: boolean = false;

    constructor(mode: ProjectorMode, message: string, dwellMs: number, paused: boolean, darkMode: boolean) {
        this.mode = mode;
        this.message = message;
        this.dwellMs = dwellMs;
        this.paused = paused;
        this.darkMode = darkMode;
    }
}