# Changelog

All notable changes to `@checkcourt/sdk` are listed here. The SDK is in `0.x`: minor
versions may contain breaking changes.

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
