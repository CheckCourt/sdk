# Changelog

All notable changes to `@checkcourt/sdk` are listed here. The SDK is in `0.x`: minor
versions may contain breaking changes.

## 0.5.0

### Added

- Six new extension points in `EXTENSION_POINTS`, `EXTENSION_POINT_SCOPE`, `PointSubject`
  and `PointCapabilities`:
  - `court.annotation` (club, declarative, needs `courts:read`): small badges in the court
    headers of the booking plan and on the kiosk. One request per installation covers the
    whole day; the render carries `date` and `courts`.
  - `member.list.column` (club, declarative, needs `members:read`): an app column on the
    member list for admins. The render carries the `members` of the visible page. Viewer
    capability `can_edit_members`. An optional manifest `label` is shown as the column
    header until the app answers.
  - `member.settings.section` (member apps, declarative or iframe): a card on the connected
    member's own settings page.
  - `booking.hint` (club, declarative, needs `bookings:read`): an informational hint in the
    booking dialog. The render carries the `draft` (court, date, times, type). CheckCourt
    waits at most 1 second (`BOOKING_HINT_TIMEOUT_MS`).
  - `booking_plan.action` (club, declarative, needs `courts:read`): a button in the
    booking plan header. Subject `{ type: "booking_plan", id: "YYYY-MM-DD" }`, viewer
    capability `can_edit_bookings`.
  - `sidebar.action` (club and member apps, declarative): an entry in the sidebar and the
    mobile navigation.
- `booking_plan.action` and `sidebar.action` are static actions (`STATIC_ACTION_POINTS`):
  CheckCourt draws them from the manifest and calls the app only on click. Their `label` is
  required, at most 24 characters (`STATIC_ACTION_LABEL_MAX`), and they may set an `icon`
  from `APP_ACTION_ICONS` (lucide names, type `AppActionIcon`). `defineManifest` rejects a
  missing label and an `icon` on any other point at compile time.
- `verifyExtensionRequest` returns the extra fields of a render as typed, validated
  properties: `date` and `courts` (`AnnotationCourt`), `members` (`ColumnMember`) and
  `draft` (`BookingDraft`, with `BOOKING_DRAFT_TYPES`). A render missing them is rejected
  with `invalid_body`.
- Builders for the compact answers, all accepting `{ maxAge }` like `ui.doc`:
  - `ui.annotations([{ court_id, label, variant? }])` returns an `AnnotationsDocument`.
  - `ui.column({ title, values: [{ member_id, text, variant? }] })` returns a
    `ColumnDocument`.
  - `ui.hint(blocks)` returns a `UiHintDocument`, limited to text, badge, key_value and link
    blocks (`UiHintBlock`).

  They throw a `RangeError` or `TypeError` on answers CheckCourt would reject: an
  annotation label over 24 characters, a column title over 20 or a cell text over 24
  characters, two annotations for one court, two values for one member, more than 6 hint
  blocks or any other hint block type.
- Limits with the platform's names: `ANNOTATION_LABEL_MAX`, `MAX_ANNOTATIONS_PER_COURT`,
  `COLUMN_TITLE_MAX`, `COLUMN_TEXT_MAX`, `MAX_APP_COLUMNS`, `MAX_SIDEBAR_ACTIONS`,
  `BOOKING_HINT_TIMEOUT_MS`, `BOOKING_HINT_BLOCKS`, `MAX_HINT_BLOCKS`, `MAX_BOOKING_HINTS`.

### Behaviour notes

- CheckCourt now normalises the layout of every declarative document: at the top level and
  inside each `stack`, content blocks come first, then one wrapping row with all buttons of
  that level, then one row with all links. `row` containers keep their order. Place blocks
  in any order; buttons always appear above links.
- Compact surfaces (annotations, column cells, booking hints) show nothing when the app is
  slow, unreachable or answers with an invalid document. CheckCourt shows at most 2 badges
  per court, 2 app columns, 2 booking hints and 2 sidebar entries, chosen by app name.

## 0.4.0

### Added

- `ui.doc(blocks, { maxAge })` and `ui.hidden({ maxAge })` add `cache: { max_age }` to the
  document: how many seconds CheckCourt may reuse the render. `0` turns caching off.
  CheckCourt caps the value at 300 seconds (`UI_CACHE_MAX_AGE_LIMIT`). Without it, CheckCourt
  follows the response's `Cache-Control` header (`no-store`, `no-cache`, `max-age=N`), and
  otherwise keeps a render for 30 seconds. A `maxAge` that is not a whole number of seconds
  `>= 0` throws a `RangeError`.
- Types `UiCache` and `UiDocumentOptions`, and `cache` on `UiDocument` and `UiHiddenDocument`.

## 0.3.1

- The compiled `dist/` is now part of the repository, so installing from GitHub no longer runs a build. This fixes global installs of tools that depend on the SDK.

## 0.3.0

### Added

- `ui.hidden({ toast? })` returns `{ ui: "v1", hidden: true }`. A declarative extension
  uses it to say it has nothing relevant to show for an item, and CheckCourt then renders
  no card instead of an empty one. On an action, it removes the panel.
- Types `UiHiddenDocument` and `UiResponse` (everything a declarative extension may answer
  with).

### Changed

- API types regenerated. The webhook documentation in the spec now describes at most three
  delivery attempts: immediately, after 5 minutes and after another hour.

## 0.2.0

### Added

- `getMe(client)` for `GET /api/v1/me`: who connected a member app, as a pseudonymous
  `user_id` that is stable per app.
- `isCheckCourtError(error, kind?)` to recognise SDK errors without `instanceof`.
- API types for `/me` and `/members/count`.

### Fixed

- Error classes are recognised across copies of the SDK (separate bundles, duplicate
  installs) and after minification. Every error has a fixed `name`, and `instanceof`
  checks a shared brand instead of the prototype chain.
- A retry after `401` or `429` no longer waits for the discarded response body to be
  cancelled. Under runtimes that wrap `fetch` (such as Next.js), that cancellation could
  never settle and the request hung.
- `connectExtensionFrame` auto-resize no longer relies on `requestAnimationFrame`, which
  browsers skip in off-screen cross-origin frames, so the height never arrived. It now
  measures on connect, after the current task, on `load` and in every `ResizeObserver`
  callback.

### Changed

- API reference descriptions no longer contain untranslated UI labels.

## 0.1.0

First release.

- Typed `/api/v1` client (`createCheckCourtClient`, `unwrap`) generated from the OpenAPI
  spec, with retries on `429` that honour `Retry-After` and one retry with a fresh token
  after `401`.
- Authentication strategies `apiKeyAuth`, `installationAuth` and `userAuth`, with token
  caching, single-flight refresh with rotation, and the errors `TokenRevokedError` and
  `AppTemporarilyUnavailableError`.
- OAuth 2.1 with PKCE: `createPkcePair`, `createState`, `buildAuthorizeUrl`,
  `parseAuthorizeCallback`, `exchangeCode`, `refreshTokens`, `revokeToken`,
  `fetchInstallationToken`.
- Webhook verification (`verifyWebhook`, `signWebhookPayload`) with typed events.
- UI extensions: `verifyExtensionContext`, `verifyExtensionRequest` and the `ui` builder
  for `ui: "v1"` documents.
- Browser entry point `@checkcourt/sdk/iframe` with `connectExtensionFrame`.
- `defineManifest` with compile-time checks.
- `getInstallation(client)` for `GET /api/v1/app/installation` and the
  `app.settings_updated` event.
- Verification uses WebCrypto, so it also runs on edge runtimes. `verifyWebhook` and
  `verifyExtensionContext` are therefore asynchronous.
