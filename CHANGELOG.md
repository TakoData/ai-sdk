# Changelog

## [3.0.0](https://github.com/TakoData/ai-sdk/compare/ai-sdk-v2.0.1...ai-sdk-v3.0.0) (2026-08-04)


### ⚠ BREAKING CHANGES

* response and config types no longer match 2.x. See MIGRATING.md for the field-by-field migration. `deferDataRetrieval`, `contents_total_cost`, `ResultContent.format`, `TakoCardSourceIndexSegment` and `TakoCardSourcePrivateIndex` are removed; `TakoKnowledgeCardSource` and `TakoCardSourceIndex` remain as deprecated aliases.

### Features

* **contents:** expose contentFormat, maxRows, maxChars and quoteOnly ([43ba7c3](https://github.com/TakoData/ai-sdk/commit/43ba7c3a625a2168911e50ebfe35adfd5f037945))
* expose the 16 unreachable Tako request options ([e2b59ac](https://github.com/TakoData/ai-sdk/commit/e2b59ac262b04cf5da87f85c12dbeea2dfabc6da))
* realign types with Tako's current API and gate drift in CI ([10ee2d4](https://github.com/TakoData/ai-sdk/commit/10ee2d4d7bef39f616f822f5c2bb3842eb820c71))
* rename "tako" source key to "data" (keep "tako" as deprecated alias) ([f2c3e2b](https://github.com/TakoData/ai-sdk/commit/f2c3e2b134ac1ef0c40173012b8095555655ebfd))
* rename "tako" source key to "data" (keep "tako" as deprecated alias) ([1b138b1](https://github.com/TakoData/ai-sdk/commit/1b138b192686e093daf0df17a31b33fbb5945c6e))
* **request:** compose per-section builders and add location ([a0420ac](https://github.com/TakoData/ai-sdk/commit/a0420ac69c88b2f37ac6e7bb90b741c0fe11229c))
* **request:** map every data source option and guard strict without nodeIds ([a4d81c1](https://github.com/TakoData/ai-sdk/commit/a4d81c16524fa64911f4114e92048a2aadad8543))
* **request:** map every web source option to the wire ([13bd752](https://github.com/TakoData/ai-sdk/commit/13bd75240f65768d2506196c2687c261f4ba1b2a))
* **types:** add the data, web, contents and location option types ([581d74d](https://github.com/TakoData/ai-sdk/commit/581d74df558a385bc8b6241924e02628caeedf9f))


### Bug Fixes

* close two holes in the drift gate, plus review corrections ([e85ba81](https://github.com/TakoData/ai-sdk/commit/e85ba81696811490ff731506a1dc91dfb991141b))
* gate nested types for key drift, correct remaining docs and fixtures ([d194830](https://github.com/TakoData/ai-sdk/commit/d1948303c9b231bb1d5c53ad34cf8b55ea1f1944))
* gate OutputSettings and Sources for key drift, correct option docs ([997f7c3](https://github.com/TakoData/ai-sdk/commit/997f7c387e54d2008b581bf98dddbf2f9e2ea4e2))
* validate config at construction, drop three mirrored defaults, describe quote-only mode ([6665f40](https://github.com/TakoData/ai-sdk/commit/6665f4044752bf5033712dc972a6736b1d4b52a4))

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
