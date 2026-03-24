import { FerryService, FerryServiceTo } from "../types/FerryService";

export interface FerryServiceConnection {
    getAll(to: FerryServiceTo): Promise<FerryService[]>;
    replaceAll(services: FerryService[]): Promise<void>;
    getLink(): Promise<string>;
    setLink(link: string): Promise<void>;
    getCost(): Promise<string>;
    setCost(cost: string): Promise<void>;
}
