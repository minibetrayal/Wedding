import { Time, TimeType } from "../types/Time";

export interface TimesConnection {
    get(type: TimeType): Promise<Time>;
    getAll(): Promise<Record<TimeType, Time>>;
    set(type: TimeType, time: Time): Promise<void>;
}
