import { Projector, ProjectorMode } from "../types/Projector";

export interface ProjectorConnection {
    get(): Promise<Projector>;
    setMode(mode: ProjectorMode): Promise<void>;
    setMessage(message: string): Promise<void>;
    setDwellMs(dwellMs: number): Promise<void>;
    setPaused(paused: boolean): Promise<void>;
    getGuestbookEntryIds(): Promise<string[]>;
    getDarkMode(): Promise<boolean>;
    setDarkMode(darkMode: boolean): Promise<void>;
}