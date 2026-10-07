# CheckCourt TypeScript SDK

`@checkcourt/sdk` is the official TypeScript SDK for the [CheckCourt](https://checkcourt.de)
app platform. It takes care of the parts of an integration that are easy to get wrong:

- a typed client for every endpoint under `/api/v1`, generated from the OpenAPI spec
- API key, installation token and member token authentication, with token caching and
  safe refresh rotation
- OAuth 2.1 with PKCE for member apps
- webhook signature verification with typed events
- UI extensions: context token and request verification, a builder for declarative UI
  documents, and a browser helper for iframe extensions
- a fully typed app manifest

Everything the SDK does can also be built with plain HTTP. The protocol is described in the
[developer documentation](https://docs.checkcourt.de/docs/developer).

The SDK is an ES module for Node.js 20 or later and ships its own type definitions. It uses
WebCrypto, so webhook and extension verification also run on edge runtimes such as
Cloudflare Workers, Vercel Edge or Deno. Its only runtime dependency is `openapi-fetch`.

## Install

```bash
npm install @checkcourt/sdk
```

Every release is also tagged on [GitHub](https://github.com/CheckCourt/sdk/releases).

## Quick start

### API client with installation auth (club apps)

```ts
import { createCheckCourtClient, getInstallation, installationAuth, unwrap } from "@checkcourt/sdk";

const client = createCheckCourtClient({
  auth: installationAuth({
    clientId: process.env.CHECKCOURT_CLIENT_ID!, // cca_app_…
    clientSecret: process.env.CHECKCOURT_CLIENT_SECRET!, // ccas_…
    installationId: "inst_123", // from the app.installed event
  }),
});

const installation = await getInstallation(client);
const { courts } = await unwrap(client.GET("/courts"));
```

`installationAuth` fetches a short-lived installation token when needed, caches it and
renews it shortly before it expires. Use `apiKeyAuth(key)` for your own club's API key and
`userAuth({ … })` for member tokens from OAuth. Calls return `{ data, error, response }`;
`unwrap()` returns `data` or throws a `CheckCourtApiError`. Requests are retried once
after a `401` with a fresh token and with backoff after a `429`.

### Notify a member

```ts
import { sendNotification } from "@checkcourt/sdk";

// Needs notifications:send. recipient: a psn_… pseudonym from an extension context,
// the pairwise usr_… id from getMe(), or the user id if you hold members:read.
const { id } = await sendNotification(client, {
  recipient: claims.viewer.user_id!,
  title: "Deine Ballmaschine ist bereit",
  body: "Platz 3 ab 17:30 Uhr.",
  url: "/booking?date=2026-05-01",
  idempotencyKey: "reservation-8812-ready",
});
```

CheckCourt delivers the message in the member's inbox and by email if they allow it. Your
app never learns contact data or whether the member muted it.

### Verify a webhook

```ts
import { SIGNATURE_HEADER, isEventType, verifyWebhook } from "@checkcourt/sdk";

export async function POST(request: Request) {
  const event = await verifyWebhook({
    secret: process.env.CHECKCOURT_WEBHOOK_SECRET!, // whsec_…
    rawBody: await request.text(),
    signatureHeader: request.headers.get(SIGNATURE_HEADER),
  });

  if (isEventType(event, "booking.created")) {
    console.log("new booking", event.data.booking_id);
  }
  return new Response(null, { status: 200 });
}
```

`verifyWebhook` throws a `WebhookSignatureError` when the signature or timestamp does not
check out. Deduplicate on `event.id`: retries carry the same id.

### Share data and events with other apps (club apps)

Apps never call each other. They declare in the manifest what they share (`shares`, `emits`) and
what they want from other apps (`reads`, `subscribes`); CheckCourt passes the data on once the club
approves the connection.

```ts
import { getObjectMetadata, isAppEvent, publishAppEvent, putObjectMetadata } from "@checkcourt/sdk";

// Producer: attach a value to a booking (key declared under shares.metadata).
await putObjectMetadata(client, "booking", bookingId, "video_url", "https://video.example/abc");
// Producer: publish an event declared under emits.
await publishAppEvent(client, { name: "door_opened", data: { court_id: 3 } });

// Consumer: read your own and approved values of other apps, grouped by app slug.
const { metadata } = await getObjectMetadata(client, "booking", bookingId);
const videoUrl = metadata["wingfield"]?.["video_url"]?.value;

// Consumer webhook: events of other apps arrive as `app.<slug>.<name>`.
if (isAppEvent<{ court_id: number }>(event, "door-co", "door_opened")) console.log(event.data.court_id);
```

### Declarative extensions and the `ui` builder

```ts
import { ExtensionVerificationError, toast, ui, verifyExtensionRequest } from "@checkcourt/sdk";

export async function POST(request: Request) {
  let ext;
  try {
    ext = await verifyExtensionRequest({
      secret: process.env.CHECKCOURT_WEBHOOK_SECRET!,
      rawBody: await request.text(),
      headers: request.headers,
    });
  } catch (err) {
    if (err instanceof ExtensionVerificationError) return new Response(null, { status: 401 });
    throw err;
  }

  const { context } = ext;
  if (context.point !== "booking.detail.panel") return new Response(null, { status: 404 });

  if (!(await courtHasDoor(context.subject.id))) {
    // Nothing relevant for this booking: CheckCourt shows no card at all.
    return Response.json(ui.hidden());
  }

  if (ext.kind === "action" && ext.actionId === "door.open") {
    await openDoor(context.subject.id);
    return Response.json(ui.doc([ui.text("The door is open.")], { toast: toast.success("Door opened") }));
  }

  return Response.json(
    ui.doc([
      ui.heading("Court door"),
      ui.row([ui.stat("Opened today", "12"), ui.badge("Online", "secondary")]),
      ui.button("Open door", "door.open"),
    ]),
  );
}
```

CheckCourt keeps a successful render for 30 seconds. Pass `maxAge` (seconds, at most 300,
sent as `cache.max_age`) to change that for one answer, or `0` when the panel must always
be fresh:

```ts
return Response.json(ui.doc([ui.stat("Battery", `${level} %`)], { maxAge: 0 }));
```

A `Cache-Control` response header (`no-store`, `max-age=N`) works too; `maxAge` wins when
both are set. In your sandbox club nothing is cached.

Forms collect input for an action. A text field becomes a multi-line box with `multiline`
(and an optional `rows`, 1 to 12); the submitted value stays a string:

```ts
ui.form({
  actionId: "report",
  submitLabel: "Meldung senden",
  fields: [ui.field.text("message", "Platzproblem melden", { multiline: true, rows: 4, max_length: 500 })],
});
```

`ui.field.date` and `ui.field.time` render native date and time pickers. `default`, `min` and
`max` are `YYYY-MM-DD` strings for dates and `HH:MM` (24-hour) strings for times; `time` takes an
optional `step` in minutes. Both submit their value as a string:

```ts
ui.form({
  actionId: "block",
  submitLabel: "Sperren",
  fields: [
    ui.field.date("day", "Tag", { min: "2026-01-01", required: true }),
    ui.field.time("from", "Von", { min: "07:00", max: "22:00", step: 30, required: true }),
  ],
});
```

Blocks can carry an `icon` from `UI_ICONS` (text, heading, stat, badge, list items), a `stat`
can be `size: "lg"`, badges have a soft amber `"warning"` variant, `ui.columns` lays out 2
to 6 children in equal widths, and `ui.row(children, { justify: "between" })` spreads a row
across the full width (first child left, last child right). A weather widget:

```ts
const days = [
  ["Heute", "sun", "24°"],
  ["Do", "cloud-sun", "21°"],
  ["Fr", "cloud-rain", "17°"],
  ["Sa", "cloud-drizzle", "18°"],
  ["So", "sun", "23°"],
] as const;

ui.doc([
  ui.row(
    [
      ui.stat("Jetzt", "24°", { icon: "sun", size: "lg", hint: "Sonnig" }),
      ui.badge("Regen möglich", { variant: "warning", icon: "droplets" }),
    ],
    { justify: "between" },
  ),
  ui.divider(),
  ui.columns(
    days.map(([day, icon, temp]) => ui.stat(day, temp, { icon })),
    { dividers: true, align: "center" },
  ),
]);
```

Compare `context.installation_id` and `context.tenant_id` with what you stored from
`app.installed` before you act on a request. For the context token alone (for example in
the backend of an iframe extension), use `verifyExtensionContext(token, secret)`.

### Host surfaces

Some points are drawn by CheckCourt itself and only ask your app for a few words. Answer them
with the matching builder; each throws when the answer would break CheckCourt's limits.

| Point | Request carries | Answer with |
|---|---|---|
| `court.annotation` | `ext.date`, `ext.courts` | `ui.annotations([{ court_id, label, variant? }])`, label up to 24 characters, one per court |
| `member.list.column` | `ext.members` | `ui.column({ title, values: [{ member_id, text, variant? }] })`, title up to 20, text up to 24 characters |
| `booking.hint` | `ext.draft` | `ui.hint([...])` with up to 6 text, badge, key_value or link blocks; answer within 1 second |
| `booking_plan.action` | `ext.date`, `ext.courts` (and the day as subject) | `ui.doc([...])`, shown in a dialog after a click; `ui.hidden()` closes it |
| `sidebar.action` | nothing extra | `ui.doc([...])`, shown in a dialog after a click; `ui.hidden()` closes it |
| `member.settings.section` | nothing extra | `ui.doc([...])`, a card on the member's own settings page |
| `nav.page` | nothing extra | `ui.doc([...])` (or an iframe), the content of the app's own page |

```ts
if (ext.kind === "render" && ext.point === "court.annotation" && ext.date && ext.courts) {
  const wet = await wetCourts(ext.date);
  return Response.json(
    ui.annotations(
      ext.courts.filter((c) => wet.has(c.id)).map((c) => ({ court_id: c.id, label: "Nass", variant: "secondary" })),
      { maxAge: 300 },
    ),
  );
}
```

`booking_plan.action` and `sidebar.action` need a `label` (at most 24 characters) in the
manifest and may set an `icon` from `APP_ACTION_ICONS`. In every declarative document,
CheckCourt places content first, then the buttons, then the links of each level.

`nav.page` gives your app an entry in the main navigation and a full page of its own at
`/apps/<installation id>/<index>`. It needs a `label` (at most 24 characters, also the page
title) and an `icon` from `APP_ACTION_ICONS`, may be declarative or an iframe, and appears at
most once per manifest. A club installation's entry is shown to every member of the club, a
member installation's entry only to that member:

```ts
defineManifest({
  installTargets: ["tenant"],
  extensions: [{ point: "nav.page", kind: "declarative", url: "https://app.example.de/ext/page", label: "Trainingsplan", icon: "calendar" }],
  dataProcessing: { categories: ["Trainingsdaten"], purpose: "Zeigt den Trainingsplan", storageLocation: "EU", avvRequired: false },
});

if (ext.point === "nav.page") {
  return Response.json(ui.doc([ui.heading("Diese Woche"), ui.text("Dienstag 18 Uhr: Jugendtraining")]));
}
```

#### Permissions for the club's roles

A club app can offer its own rights (at most `MAX_APP_PERMISSIONS`, keys matching
`APP_PERMISSION_KEY_PATTERN`). The club decides in its role editor which roles hold them; only
administrators hold them from the start. Every extension request carries the viewer's flags
for all declared keys in `viewer.capabilities.permissions`, and a `nav.page` with `requires`
is only listed and opened for holders:

```ts
defineManifest({
  installTargets: ["tenant"],
  permissions: [{ key: "manage_ladder", label: "Rangliste verwalten", description: "Darf Ergebnisse korrigieren" }],
  extensions: [
    { point: "nav.page", kind: "declarative", url: "https://ladder.example.de/ext/admin", label: "Rangliste", icon: "trophy", requires: "manage_ladder" },
    { point: "dashboard.widget", kind: "declarative", url: "https://ladder.example.de/ext/widget" },
  ],
  dataProcessing: { categories: ["Spielergebnisse"], purpose: "Führt die Rangliste", storageLocation: "EU", avvRequired: false },
});

const { context } = ext; // from verifyExtensionRequest, as above
if (context.viewer.capabilities.permissions?.manage_ladder) {
  // show the edit buttons
}
```

### OAuth with PKCE (member apps)

```ts
import { buildAuthorizeUrl, createPkcePair, createState, exchangeCode, parseAuthorizeCallback } from "@checkcourt/sdk";

// 1. Redirect the member to CheckCourt
const pkce = await createPkcePair();
const state = createState();
// keep pkce.verifier and state in the member's session
const authorizeUrl = buildAuthorizeUrl({
  clientId: process.env.CHECKCOURT_CLIENT_ID!,
  redirectUri: "https://calendar.example.com/callback",
  state,
  codeChallenge: pkce.challenge,
});

// 2. In the callback, check state and exchange the code
const { code } = parseAuthorizeCallback(new URL(callbackUrl), state);
const tokens = await exchangeCode({
  clientId: process.env.CHECKCOURT_CLIENT_ID!,
  clientSecret: process.env.CHECKCOURT_CLIENT_SECRET!,
  code,
  redirectUri: "https://calendar.example.com/callback",
  codeVerifier: pkce.verifier,
});
```

Pass the stored tokens to `userAuth({ tokens, onTokens, … })`; it refreshes them with
rotation and calls `onTokens` with every new set, which you must persist.

### iframe extensions (browser)

```ts
import { connectExtensionFrame } from "@checkcourt/sdk/iframe";

const frame = connectExtensionFrame(); // keeps the height in sync and applies the theme

// Send frame.context to your backend and verify it there, never in the browser.
await fetch("/api/session", { method: "POST", body: JSON.stringify({ context: frame.context }) });

frame.toast("success", "Saved");
frame.navigate("/booking?date=2026-10-07");
```

Import the browser entry point `@checkcourt/sdk/iframe` only; it needs no secrets.

The frame starts at 240 pixels, a `nav.page` frame fills the page. Set `height` on the
manifest entry (whole pixels, `IFRAME_EXTENSION_HEIGHT_MIN` to `IFRAME_EXTENSION_HEIGHT_MAX`,
120 to 2000) to start at another height; `height` is for iframe extensions only.
Resize messages from `connectExtensionFrame` replace either value:

```ts
{ point: "nav.page", kind: "iframe", url: "https://app.example.de/page", label: "Homepage", icon: "calendar", height: 900 }
```

Every app has a signing secret (`whsec_…`) from the moment it is created, with or without a
webhook URL. Verify the context token with it in your backend; you can show it once and
rotate it in the developer portal (your app → *Webhooks* → *Signatur-Secret*).

## Entry points

| Import | Runs in | Contents |
|---|---|---|
| `@checkcourt/sdk` | Server | Everything except the iframe part |
| `@checkcourt/sdk/oauth` | Server | OAuth and installation tokens |
| `@checkcourt/sdk/webhooks` | Server, edge | Webhook verification and event types |
| `@checkcourt/sdk/extensions` | Server, edge | Context tokens, request verification, UI builder, host surface builders |
| `@checkcourt/sdk/manifest` | Anywhere | `defineManifest` and constants |
| `@checkcourt/sdk/iframe` | Browser | `connectExtensionFrame` and messages |

Client secrets, webhook secrets and refresh tokens belong on your server only.

## Documentation

Full guides and the API reference: <https://docs.checkcourt.de/docs/developer/sdk>

## Versioning

The SDK follows semantic versioning but is still in `0.x`: minor releases may contain
breaking changes until 1.0. Pin a version and read the [changelog](CHANGELOG.md) before you
upgrade.

The exported constant `OPENAPI_SPEC_SHA256` is the SHA-256 of the spec the bundled types
were generated from, in the form served at `https://app.checkcourt.de/api/v1/openapi`.
Compare it with a hash of that response to see whether the platform has changed since this
release.

## Security

Please do not report security issues in public GitHub issues. Report them privately to
CheckCourt support at [support@checkcourt.de](mailto:support@checkcourt.de).

## Contributing

Bug reports and pull requests are welcome.

```bash
npm install
npm run typecheck
npm test
npm run build
```

The API types in `src/generated/` are generated from the live OpenAPI spec:

```bash
npm run generate                                    # https://app.checkcourt.de/api/v1/openapi
CHECKCOURT_OPENAPI=./openapi.json npm run generate  # a local file or another URL
```

The generated types follow the platform. A release may ship types for endpoints that are
about to be deployed, so do not regenerate them in an unrelated pull request.

### Releasing

1. Bump `version` in `package.json` (`npm version <x.y.z> --no-git-tag-version`).
2. Add the release to `CHANGELOG.md`.
3. Run `npm run build` and commit, including the rebuilt `dist/`.
4. Tag the commit `vX.Y.Z` and push the tag (`git push origin vX.Y.Z`).

The release workflow checks that the tag matches the package version and that `dist/` is
up to date, then publishes to npm with provenance via trusted publishing.

## License

[MIT](LICENSE)
