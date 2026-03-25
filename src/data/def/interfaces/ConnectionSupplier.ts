import { InviteConnection } from "./InviteConnection";
import { AuthorConnection } from "./AuthorConnection";
import { GuestbookConnection } from "./GuestbookConnection";
import { PhotoConnection } from "./PhotoConnection";
import { InviteeConnection } from "./InviteeConnection";
import { ProjectorConnection } from "./ProjectorConnection";
import { FerryServiceConnection } from "./FerryServiceConnection";
import { NamesConnection } from "./NamesConnection";
import { ScheduleConnection } from "./ScheduleConnection";
import { LocationConnection } from "./LocationConnection";
import { TimesConnection } from "./TimesConnection";
import { MenuConnection } from "./MenuConnection";

export interface ConnectionSupplier {
    prepare(): Promise<void>;
    getInviteConnection(): InviteConnection;
    getAuthorConnection(): AuthorConnection;
    getGuestbookConnection(): GuestbookConnection;
    getPhotoConnection(): PhotoConnection;
    getInviteeConnection(): InviteeConnection;
    getProjectorConnection(): ProjectorConnection;
    getFerryServiceConnection(): FerryServiceConnection;
    getNamesConnection(): NamesConnection;
    getScheduleConnection(): ScheduleConnection;
    getLocationConnection(): LocationConnection;
    getTimesConnection(): TimesConnection;
    getMenuConnection(): MenuConnection;
}