export class Settings {
    names: string;
    namesShort: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
    rsvpCloseDate: string;
    siteLocked: boolean;

    constructor(names: {[key in keyof Settings]?: Settings[key]}) {
        this.names = names.names ?? '';
        this.namesShort = names.namesShort ?? '';
        this.contactName = names.contactName ?? '';
        this.contactPhone = names.contactPhone ?? '';
        this.contactEmail = names.contactEmail ?? '';
        this.rsvpCloseDate = names.rsvpCloseDate ?? '';
        this.siteLocked = names.siteLocked ?? false;
    }
}

export const DEFAULT_SETTINGS: Settings = new Settings({});