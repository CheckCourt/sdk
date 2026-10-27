import { unwrap, type CheckCourtClient } from "./client.js";

export interface DirectoryMember {
  userId: string;
  /** The membership, the same id as `member_id` in `member.*` events. */
  memberId: string;
  name: string;
}

export type MemberDirectoryQuery = { search: string; limit?: number } | { ids: string[] };

/**
 * `GET /api/v1/members/directory`: names of the club's approved members, without contact data.
 * Search by name (at least 2 characters) or look up up to 50 user ids. Needs `members:read`.
 */
export async function memberDirectory(client: CheckCourtClient, query: MemberDirectoryQuery): Promise<DirectoryMember[]> {
  const params = "ids" in query ? { ids: query.ids.join(",") } : { search: query.search, ...(query.limit ? { limit: query.limit } : {}) };
  return (await unwrap(client.GET("/members/directory", { params: { query: params } }))).members;
}
