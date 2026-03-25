export class Time {
    min: number;
    max?: number;

    constructor(min: number, max?: number) {
        this.min = min;
        this.max = max;
    }

    toString(): string {
        if (this.max) return `${this.min}-${this.max}`;
        return `${this.min}`;
    }
}

export enum TimeType {
    trainToMainland = 'trainToMainland',
    carParkToIsland = 'carParkToIsland',
    islandToCeremony = 'islandToCeremony',
    mainlandToReception = 'mainlandToReception',
    mainlandToIsland = 'mainlandToIsland',
}