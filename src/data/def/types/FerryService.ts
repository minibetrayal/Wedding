export type FerryServiceTo = 'island' | 'mainland';

export type FerryService = {
    to: FerryServiceTo;
    platform: string;
    time: Date;
    via: string;
    arriving: Date;
};
