import { InviteConnection } from "./interfaces/InviteConnection";
import { AuthorConnection } from "./interfaces/AuthorConnection";
import { GuestbookConnection } from "./interfaces/GuestbookConnection";
import { PhotoConnection } from "./interfaces/PhotoConnection";
import { InviteeConnection } from "./interfaces/InviteeConnection";
import { ProjectorConnection } from "./interfaces/ProjectorConnection";
import { ConnectionSupplier } from "./interfaces/ConnectionSupplier";
import { DataPopulator } from "./interfaces/DataPopulator";
import { FerryServiceConnection } from "./interfaces/FerryServiceConnection";


export class DataConnection  {
    static instance: DataConnection;

    invites: InviteConnection;
    authors: AuthorConnection;
    guestbook: GuestbookConnection;
    photos: PhotoConnection;
    invitees: InviteeConnection;
    projector: ProjectorConnection;
    ferryServices: FerryServiceConnection;
    
    private static isInitialized: boolean = false;
    
    private constructor(connectionSupplier: ConnectionSupplier) {
        this.invites = connectionSupplier.getInviteConnection();
        this.authors = connectionSupplier.getAuthorConnection();
        this.guestbook = connectionSupplier.getGuestbookConnection();
        this.photos = connectionSupplier.getPhotoConnection();
        this.invitees = connectionSupplier.getInviteeConnection();
        this.projector = connectionSupplier.getProjectorConnection();
        this.ferryServices = connectionSupplier.getFerryServiceConnection();
    }

    static async init(connectionSupplier: ConnectionSupplier, populator?: DataPopulator): Promise<void> {
        if (DataConnection.isInitialized) {
            throw new Error('DataConnection already initialized');
        }
        await connectionSupplier.prepare();
        const connection = new DataConnection(connectionSupplier);
        if (populator) await populator.populate(connection);
        DataConnection.instance = connection;
        DataConnection.isInitialized = true;
    }
}

export function getDataConnection(): DataConnection {
    const connection = DataConnection.instance;
    if (!connection) throw new Error('DataConnection not created');
    return connection;
}

