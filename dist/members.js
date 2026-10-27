import { unwrap } from "./client.js";
/**
 * `GET /api/v1/members/directory`: names of the club's approved members, without contact data.
 * Search by name (at least 2 characters) or look up up to 50 user ids. Needs `members:read`.
 */
export async function memberDirectory(client, query) {
    const params = "ids" in query ? { ids: query.ids.join(",") } : { search: query.search, ...(query.limit ? { limit: query.limit } : {}) };
    return (await unwrap(client.GET("/members/directory", { params: { query: params } }))).members;
}
