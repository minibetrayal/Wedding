export class Settings {
    siteLocked: boolean;

    constructor(siteLocked: boolean) {
        this.siteLocked = siteLocked;
    }
}

export const DEFAULT_SETTINGS: Settings = new Settings(
    false
);