export class Location {
    name: string;
    address?: string;

    constructor(name: string, address?: string) {
        this.name = name;
        this.address = address;
    }

    /** Full line for map links and copy that used the old “long” env value: prefer address when set. */
    mapLine(): string {
        return this.address?.trim() ?? this.name;
    }
}

export enum LocationType {
    island = 'island',
    islandFerry = 'islandFerry',
    ceremony = 'ceremony',
    reception = 'reception',
    receptionParking = 'receptionParking',
    mainland = 'mainland',
    trainStation = 'trainStation',
    carPark = 'carPark',
}