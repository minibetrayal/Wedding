export type FerryServiceTo = 'island' | 'mainland';

export class FerryService {
    to: FerryServiceTo;
    platform: string;
    time: Date;
    via: string;
    arriving: Date;

    constructor(to: FerryServiceTo, platform: string, time: Date, via: string, arriving: Date) {
        this.to = to;
        this.platform = platform;
        this.time = time;
        this.via = via;
        this.arriving = arriving;
    }
}