import { unwrap } from "./client.js";
/**
 * `GET /api/v1/app/installation`: the calling club app's own installation with the club's
 * settings. Only with an installation token (`cca_`); read it after `app.installed`,
 * `app.upgraded` and `app.settings_updated`, whose payloads carry ids only.
 */
export async function getInstallation(client) {
    return unwrap(client.GET("/app/installation"));
}
/**
 * `GET /api/v1/me`: who connected the member app. Only with a member token (`ccu_`). `user_id` is a
 * pseudonym stable for your app and different for every other app; it carries no name or email.
 */
export async function getMe(client) {
    return unwrap(client.GET("/me"));
}
