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

CheckCourt keeps a successful render for 30 seconds. Pass `maxAge` (seconds, at most 300)
to change that for one answer, or `0` when the panel must always be fresh:

```ts
return Response.json(ui.doc([ui.stat("Battery", `${level} %`)], { maxAge: 0 }));
```

A `Cache-Control` response header (`no-store`, `max-age=N`) works too; `maxAge` wins when
both are set. In your sandbox club nothing is cached.

Compare `context.installation_id` and `context.tenant_id` with what you stored from
`app.installed` before you act on a request. For the context token alone (for example in
the backend of an iframe extension), use `verifyExtensionContext(token, secret)`.

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

## Entry points

| Import | Runs in | Contents |
|---|---|---|
| `@checkcourt/sdk` | Server | Everything except the iframe part |
| `@checkcourt/sdk/oauth` | Server | OAuth and installation tokens |
| `@checkcourt/sdk/webhooks` | Server, edge | Webhook verification and event types |
| `@checkcourt/sdk/extensions` | Server, edge | Context tokens, request verification, UI builder |
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
