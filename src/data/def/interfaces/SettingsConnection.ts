import { Settings } from "../types/Settings";

export interface SettingsConnection {
    get<K extends keyof Settings>(key: K): Promise<Settings[K]>;
    set<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void>;
}   