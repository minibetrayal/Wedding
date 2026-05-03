import { refreshAdminAuthCookie } from "./adminAuth";
import { refreshAuthorCookie, refreshDisplayNameCookie } from "./authorCookie";
import { refreshLockedCookie } from "./lockedCookie";
import { refreshRsvpCookie } from "./rsvpCookie";

export const refreshCookies = [
    refreshAuthorCookie,
    refreshLockedCookie,
    refreshRsvpCookie,
    refreshAdminAuthCookie,
    refreshDisplayNameCookie
]