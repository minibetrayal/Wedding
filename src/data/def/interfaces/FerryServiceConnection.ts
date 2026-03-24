import { FerryService, FerryServiceTo } from "../types/FerryService";

export interface FerryServiceConnection {
    getAll(to: FerryServiceTo): Promise<FerryService[]>;
    replaceAll(services: FerryService[]): Promise<void>;
}
