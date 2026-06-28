# Changelog

## [2.1.0](https://github.com/TakoData/ai-sdk/compare/ai-sdk-v2.0.1...ai-sdk-v2.1.0) (2026-06-28)


### Features

* rename "tako" source key to "data" (keep "tako" as deprecated alias) ([f2c3e2b](https://github.com/TakoData/ai-sdk/commit/f2c3e2b134ac1ef0c40173012b8095555655ebfd))
* rename "tako" source key to "data" (keep "tako" as deprecated alias) ([1b138b1](https://github.com/TakoData/ai-sdk/commit/1b138b192686e093daf0df17a31b33fbb5945c6e))

## [2.0.1](https://github.com/TakoData/ai-sdk/compare/ai-sdk-v2.0.0...ai-sdk-v2.0.1) (2026-06-25)


### Bug Fixes

* standardize on the tako.com host ([#5](https://github.com/TakoData/ai-sdk/issues/5)) ([5a514cf](https://github.com/TakoData/ai-sdk/commit/5a514cf2cd1343f443f78dec3318c469a5619309))

## [2.0.0](https://github.com/TakoData/ai-sdk/compare/ai-sdk-v1.0.1...ai-sdk-v2.0.0) (2026-06-25)

A full refresh of `@takoviz/ai-sdk` onto Tako's GA public API — shipped as three Vercel AI SDK tools — with a modern ESM/pnpm toolchain and automated releases ([#2](https://github.com/TakoData/ai-sdk/pull/2)).

### ⚠ BREAKING CHANGES

* The single `takoSearch` tool that called the now-internal `POST /api/v1/knowledge_search` is replaced by three tools targeting Tako's GA endpoints. The legacy `TakoKnowledgeCard` / `TakoSearchResponse` / `TakoVisualizationData` types and the old `searchEffort: "auto"` / `connected_data` config are removed; response types now mirror the new API wire shapes.

### Features

* **`takoSearch()`** → `POST /api/v3/search`: Tako knowledge cards (charts/metrics with sources) plus web results — fast retrieval, no synthesis.
* **`takoAnswer()`** → `POST /api/v1/answer`: a grounded, citation-backed answer plus the backing cards and web results.
* **`takoContents()`** → `POST /api/v1/contents`: the data behind a result URL — a card's CSV or a web page's extracted text — via `url` (short-lived presigned link, default) or `inline` (content in the response, CSV capped at 1000 rows) mode.
* `baseUrl` config for staging / self-host; `apiKey` falls back to the `TAKO_API_KEY` / `TAKO_API_TOKEN` env vars.
* Works with both `ai` v6 and v7 (`peerDependencies: ai@^6.0.18 || ^7.0.0`).

### Build & Tooling

* ESM-only package built with tsup; pnpm; **zero runtime dependencies** (`ai` and `zod` are peer dependencies).
* Automated releases via release-please with npm provenance publishing, plus PR CI (build + typecheck + vitest).

### Miscellaneous Chores

* trigger 2.0.0 release ([#3](https://github.com/TakoData/ai-sdk/issues/3)) ([cf4697d](https://github.com/TakoData/ai-sdk/commit/cf4697d26c63ae96d3f1c09cf90f3fe47830fea9))
