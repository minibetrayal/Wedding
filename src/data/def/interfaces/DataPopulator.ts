import type { DataConnection } from "../DataConnection";

export interface DataPopulator {
    populate(connection: DataConnection): Promise<void>;
}