import { Location, LocationType } from "../types/Location";

export interface LocationConnection {
    get(type: LocationType): Promise<Location>;
    getAll(): Promise<Record<LocationType, Location>>;
    set(type: LocationType, location: Location): Promise<void>;
}
