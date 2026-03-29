import { InviteConnection } from "./InviteConnection";
import { AuthorConnection } from "./AuthorConnection";
import { GuestbookConnection } from "./GuestbookConnection";
import { PhotoConnection } from "./PhotoConnection";
import { InviteeConnection } from "./InviteeConnection";
import { ProjectorConnection } from "./ProjectorConnection";
import { FerryServiceConnection } from "./FerryServiceConnection";
import { ScheduleConnection } from "./ScheduleConnection";
import { LocationConnection } from "./LocationConnection";
import { TimesConnection } from "./TimesConnection";
import { MenuConnection } from "./MenuConnection";
import { FaqConnection } from "./FaqConnection";
import { SettingsConnection } from "./SettingsConnection";

export interface ConnectionSupplier {
    prepare(): Promise<void>;
    getInviteConnection(): InviteConnection;
    getAuthorConnection(): AuthorConnection;
    getGuestbookConnection(): GuestbookConnection;
    getPhotoConnection(): PhotoConnection;
    getInviteeConnection(): InviteeConnection;
    getProjectorConnection(): ProjectorConnection;
    getFerryServiceConnection(): FerryServiceConnection;
    getScheduleConnection(): ScheduleConnection;
    getLocationConnection(): LocationConnection;
    getTimesConnection(): TimesConnection;
    getMenuConnection(): MenuConnection;
    getFaqConnection(): FaqConnection;
    getSettingsConnection(): SettingsConnection;
}