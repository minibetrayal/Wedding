import type { ScheduleSnapshot } from "../types/ScheduledEvent";

export interface ScheduleConnection {
    get(): Promise<ScheduleSnapshot>;
    set(snapshot: ScheduleSnapshot): Promise<void>;
}
