import { formatTimeStr } from "../../../util/timeUtils";

export class ScheduledEvent {
    name: string;
    time: string;

    constructor(name: string, time: string) {
        this.name = name;
        this.time = time;
    }

    formatted: (date: string) => string = (date: string) => formatTimeStr(date, this.time);
}

/** In-memory schedule: ordered events plus which row is arrival / ceremony / reception / end of day. */
export class ScheduleSnapshot {
    events: ScheduledEvent[];
    arrivalIndex: number;
    ceremonyIndex: number;
    receptionIndex: number;
    /** Row index for the designated “end of day” time. */
    endOfDayIndex: number;

    constructor(events: ScheduledEvent[], arrival: number, ceremony: number, reception: number, endOfDay: number) {
        this.events = events;
        this.arrivalIndex = arrival;
        this.ceremonyIndex = ceremony;
        this.receptionIndex = reception;
        this.endOfDayIndex = endOfDay;
    }

    arrival: () => ScheduledEvent = () => this.events[this.arrivalIndex];
    ceremony: () => ScheduledEvent = () => this.events[this.ceremonyIndex];
    reception: () => ScheduledEvent = () => this.events[this.receptionIndex];
    endOfDay: () => ScheduledEvent = () => this.events[this.endOfDayIndex];
};

/** Used when no schedule is loaded from dummy data — ensures a valid four-role schedule. */
export const DEFAULT_SCHEDULE_SNAPSHOT: ScheduleSnapshot = new ScheduleSnapshot([
    new ScheduledEvent('Arrival', '00:01'),
    new ScheduledEvent('Ceremony Start', '00:02'),
    new ScheduledEvent('Reception Start', '00:03'),
    new ScheduledEvent('End of Day', '00:04'),
], 0, 1, 2, 3);