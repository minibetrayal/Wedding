export type FerryServiceTo = 'island' | 'mainland';

export class FerryService {
    to: FerryServiceTo;
    platform: string;
    time: string;
    via: string;
    arriving: string;

    constructor(to: FerryServiceTo, platform: string, time: string, via: string, arriving: string) {
        this.to = to;
        this.platform = platform;
        this.time = time;
        this.via = via;
        this.arriving = arriving;
    }
}