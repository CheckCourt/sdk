import { unwrap, type CheckCourtClient } from "./client.js";
import type { components } from "./generated/schema.js";

export type AppInstallation = components["schemas"]["AppInstallation"];

/**
 * `GET /api/v1/app/installation`: the calling club app's own installation with the club's
 * settings. Only with an installation token (`cca_`); read it after `app.installed`,
 * `app.upgraded` and `app.settings_updated`, whose payloads carry ids only.
 */
export async function getInstallation(client: CheckCourtClient): Promise<AppInstallation> {
  return unwrap(client.GET("/app/installation"));
}

export type Me = components["schemas"]["Me"];

/**
 * `GET /api/v1/me`: who connected the member app. Only with a member token (`ccu_`). `user_id` is a
 * pseudonym stable for your app and different for every other app; it carries no name or email.
 */
export async function getMe(client: CheckCourtClient): Promise<Me> {
  return unwrap(client.GET("/me"));
}
