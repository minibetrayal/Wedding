export type ScheduledEvent = {
    name: string;
    time: string;
};

/** In-memory schedule: ordered events plus which row is arrival / ceremony / reception / end of day. */
export type ScheduleSnapshot = {
    events: ScheduledEvent[];
    arrival: number;
    ceremony: number;
    reception: number;
    /** Row index for the designated “end of day” time. */
    endOfDay: number;
};

/** Used when no schedule is loaded from dummy data — ensures a valid four-role schedule. */
export const DEFAULT_SCHEDULE_SNAPSHOT: ScheduleSnapshot = {
    events: [
        { name: 'Arrival', time: '00:01' },
        { name: 'Ceremony Start', time: '00:02' },
        { name: 'Reception Start', time: '00:03' },
        { name: 'End of Day', time: '00:04' },
    ],
    arrival: 0,
    ceremony: 1,
    reception: 2,
    endOfDay: 3,
};
