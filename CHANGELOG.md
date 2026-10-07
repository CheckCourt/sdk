# Changelog

All notable changes to `@checkcourt/sdk` are listed here. The SDK is in `0.x`: minor
versions may contain breaking changes.

## 0.12.0

- `MAX_UI_BLOCKS` is now 100 (was 50): a declarative UI document may contain up to 100
  blocks in total, nested blocks included. Requires a CheckCourt platform that accepts 100.

## 0.11.1

- docs: Admin-Pfad Automatisierungen in der API-Beschreibung. Management keys are created under
  *Admin → Automatisierungen* (Automations), where API keys and webhooks now live together.
  No type changes; `OPENAPI_SPEC_SHA256` follows the updated spec.

## 0.11.0

### Added

- `permissions` in the manifest (type `AppPermission`): rights a club app offers the club's
  roles, each with a `key` (`APP_PERMISSION_KEY_PATTERN`, unique), a German `label` (at most
  `APP_PERMISSION_LABEL_MAX` characters) and an optional `description` (at most
  `APP_PERMISSION_DESCRIPTION_MAX`). At most `MAX_APP_PERMISSIONS` (10), club installations
  only. Clubs choose the roles in their role editor; only administrators hold a new right.
- `requires` on `nav.page`: the key of a declared permission. Only holders see the
  navigation entry and may open the page and run its actions.
- `viewer.capabilities.permissions` in the extension context (type
  `AppPermissionCapabilities`): every declared key with whether the viewer holds it, at every
  point, when the manifest declares permissions.

## 0.10.0

### Added

- Icons in declarative blocks: optional `icon` on `text`, `heading`, `stat`, `badge` and on
  `list` items, from the fixed allowlist `UI_ICONS` (type `UiIcon`, lucide names: weather icons
  such as `sun`, `cloud-sun`, `cloud-rain`, `snowflake`, `wind`, `droplets`, plus general ones
  such as `check`, `info`, `alert-triangle`, `clock`, `map-pin`, `trophy`, `euro`). CheckCourt
  draws them in the text color at text size; in a `stat` the icon sits before the value.
  `ui.text(text, { tone?, icon? })`, `ui.heading(text, { level?, icon? })` (the `ui.heading(text, 3)`
  form still works), `ui.badge(label, { variant?, icon? })` (the `ui.badge(label, variant)` form
  still works), `ui.stat(label, value, { hint?, icon?, size? })`. The builders throw on an icon
  outside `UI_ICONS`.
- `columns` block and `ui.columns(children, { dividers?, align? })`: 2 to 6 children
  (`MIN_COLUMNS`, `MAX_COLUMNS`) in equal-width columns, with optional vertical dividers and
  `align: "start" | "center"` (`COLUMNS_ALIGNMENTS`). On narrow cards 4 columns wrap to 2 per
  row, 5 and 6 to 3. It counts towards the block and depth limits like `row` and `stack`.
  `ui.columns` throws on any other child count.
- `justify: "start" | "between"` on `row` (`ROW_JUSTIFICATIONS`, type `RowJustify`) and
  `ui.row(children, { justify? })`; the `ui.row(children)` form still works. `between` spreads
  the children across the full width, first at the left edge, last at the right, vertically
  centered; on narrow cards they still wrap. `ui.row` throws on any other value.
- Badge variant `"warning"` in `BADGE_VARIANTS` (soft amber), also for `court.annotation`
  and `member.list.column` values.
- `size: "md" | "lg"` on `stat` (`STAT_SIZES`, type `StatSize`): `lg` shows the value as a
  large display figure, for example the current temperature.
- `THEME_TOKEN_NAMES` includes `--warning`, `--warning-foreground` and `--warning-muted`, so
  iframe extensions can match the warning colors.

## 0.9.0

### Added

- Optional `height` on iframe extensions in the manifest: the frame's initial height in whole
  pixels, from `IFRAME_EXTENSION_HEIGHT_MIN` (120) to `IFRAME_EXTENSION_HEIGHT_MAX` (2000).
  `defineManifest` rejects it on declarative extensions at compile time. Without it a frame
  starts at 240 pixels and a `nav.page` frame fills the page; `checkcourt:resize` messages
  still override the height.

## 0.8.0

### Added

- Extension point `nav.page` (club and member apps, declarative or iframe, no subject, no
  required scope) in `EXTENSION_POINTS`, `EXTENSION_POINT_SCOPE`, `PointSubject` and
  `PointCapabilities`. It adds an entry to CheckCourt's main navigation that opens a full
  page with the app's UI at `/apps/<installation id>/<index>`. A club installation's entry
  is visible to every member, a member installation's entry only to that member.
- `nav.page` requires a `label` (at most 24 characters, `STATIC_ACTION_LABEL_MAX`) and an
  `icon` from `APP_ACTION_ICONS`; `defineManifest` rejects either missing at compile time.
  CheckCourt accepts at most one `nav.page` per manifest.
- `verifyExtensionRequest` verifies `nav.page` renders and actions; they carry no extra
  fields.

## 0.7.0

### Changed

- Regenerated API types from the updated OpenAPI spec. `POST /members` (invite) now returns
  `{ success, awaitingAcceptance }`: when an existing account is invited, the membership stays
  pending until the owner accepts after their next login. Updated descriptions for member update
  and deletion to reflect the rank checks and pending-invitation rules.

## 0.6.0

### Added

- `ui.field.date(name, label, { default?, min?, max?, required? })` and
  `ui.field.time(name, label, { default?, min?, max?, required?, step? })` for native date and
  time inputs in extension forms. `default`, `min` and `max` are `YYYY-MM-DD` strings for `date`
  and `HH:MM` (24-hour) strings for `time`; `time` takes an optional `step` in minutes. The
  submitted value stays a string. Types `UiDateField` and `UiTimeField`, both part of
  `UiFormField`.
- `booking_plan.action` render and action requests now carry the plan's `date` and `courts`
  (`[{ id, name }]`), the same shape `court.annotation` uses, so an app can offer a court select
  without a separate `GET /courts`. `ExtensionActionRequest` gains optional `date` and `courts`.

## 0.5.0

### Added

- `ui.field.text` accepts `multiline` and `rows` (1 to 12). A multiline text field renders as
  a text box in CheckCourt; the submitted value stays a string and `max_length` still applies.
- Manifest types for connections between apps: `shares.metadata`, `reads.metadata`, `emits` and
  `subscribes`, with `SharedMetadata`, `ReadMetadata`, `EmittedEvent`, `SubscribedEvent`,
  `AppEventSchema`, `SHARED_OBJECT_TYPES`, `SHARED_OBJECT_SCOPE` and `MAX_SHARED_VALUE_BYTES`.
- `getObjectMetadata`, `putObjectMetadata` and `deleteObjectMetadata` for
  `/api/v1/{bookings|courts|members}/{id}/metadata`, and `publishAppEvent` for
  `POST /api/v1/app/events`.
- Webhook types for events between apps: `AppMetadataChangedEvent` (`app.metadata_changed`) and
  `AppEvent` (`app.<slug>.<name>`), now part of `WebhookEvent`, with `isAppEvent`,
  `isMetadataChangedEvent` and `appEventType`.
- `sendNotification(client, { recipient, title, body, url?, category?, idempotencyKey? })`
  calls `POST /api/v1/app/notifications`: CheckCourt delivers a message to one member in
  CheckCourt and by email, without your app learning contact data. Returns
  `{ id, accepted: true }`. Types `SendNotificationInput` and `SendNotificationResponse`,
  constants `NOTIFICATION_TITLE_MAX` (80) and `NOTIFICATION_BODY_MAX` (500).
- `notifications:send` in `GRANTABLE_SCOPES`. It is app-only: no club role holds it, and a
  member app gets it from the member's consent.
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
