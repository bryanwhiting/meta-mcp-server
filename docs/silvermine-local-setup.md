# Silvermine Facebook Ads MCP: Local Setup and Readiness

Last verified: 2026-09-03

## Current status

| Area | Status | Evidence |
|---|---|---|
| Repository recovery | Ready | Canonical checkout is on `main` at `e428390`, matching `origin/main`. |
| Local dependencies | Ready | `npm ci` completed from the tracked lockfile. |
| Build | Ready | `npm run build` completed and generated `dist/index.js`. |
| MCP protocol | Ready | Token-free `initialize` and `tools/list` requests succeeded. |
| Tool catalog | Ready | 200 tools are exposed, including 62 Ads tools and 10 Commerce tools. |
| Meta authentication | Verified | A valid, non-expiring system-user token authenticated successfully with the required Ads, Business, Catalog, Page, and Leads scopes. |
| Live Meta API verification | Complete | Read-only token debugging, ad-account enumeration, Tutu School campaign enumeration, product-catalog enumeration, product-set enumeration, and product-feed enumeration succeeded. |
| Credential-output hardening | Ready | Pagination tokens are stripped from API responses, Page access tokens are omitted from JSON tool output, and regression tests cover both paths. |
| Production API compatibility | Representative reads and Ads writes verified | The server pins Graph/Marketing API `v26.0`. Ads reads and a paused create/update/read/delete lifecycle succeeded. Commerce reads succeeded, including an empty result from `meta_list_products`. |

No access token or app secret is tracked by Git. Local verification uses the ignored `.env.local` file with mode `600`.

## Local installation and development

Requirements:

- Node.js 18 or newer. Verified here with Node `v22.22.3` and npm `10.9.8`.
- The tracked `package.json` and `package-lock.json`.

Install and build:

```bash
cd /Users/bryanwhiting/meta-mcp-server
npm ci
npm run build
```

Development commands:

```bash
npm run dev       # TypeScript watch mode
npm test          # Unit and token-free MCP integration tests
npm start         # Start the compiled stdio server
```

`npm start` normally waits silently for JSON-RPC input. The server is an MCP stdio process, not a standalone HTTP service.

For persistent local verification without a password manager, store the token in the git-ignored `.env.local` file:

```dotenv
META_ACCESS_TOKEN=your_system_user_token
```

Restrict and load that file explicitly with Node:

```bash
chmod 600 .env.local
node --env-file=.env.local dist/index.js
```

The server does not load dotenv files by itself; the `--env-file` flag is required for this setup.

## Meta-side requirements

For Ads and Commerce use, Silvermine needs:

1. A Meta developer account.
2. A Meta app associated with the correct Silvermine Business Portfolio. The repository expects a Business-oriented app with the Marketing API product enabled.
3. An ad account assigned to the authenticating person or system user. Read-only work requires access to view performance; write operations require permission to manage campaigns.
4. For Commerce, the target product catalog must be owned by or shared with the Business Portfolio and assigned to the authenticating person or system user with sufficient catalog access.
5. A user or system-user access token issued by that app and scoped to the required assets and permissions.

Meta's verified Marketing API workspace lists a developer account, app, access token, permissions, and ad account as the core prerequisites. It supports both user and system-user tokens. See [Meta's official Facebook Marketing API workspace](https://www.postman.com/meta/facebook-marketing-api/documentation/0zr4mes/facebook-marketing-api-mapi).

### Required permissions for the Ads/Commerce scope

| Permission | Needed for |
|---|---|
| `ads_read` | Reading ad accounts, campaigns, ad sets, ads, and performance. |
| `ads_management` | Creating or changing campaigns, ad sets, ads, creatives, pixels, audiences, and rules. |
| `business_management` | Discovering and working with Business Portfolio assets. |
| `catalog_management` | Reading and managing product catalogs, products, product sets, and feeds. |

Additional permissions are tool-specific:

- Lead retrieval tools generally also need `leads_retrieval`, the Page assigned to the token principal, and the relevant Page lead-access task. The upstream README does not currently list `leads_retrieval`; treat this as a documentation gap.
- Page-backed ad creative and lead-form flows may require `pages_show_list`, `pages_read_engagement`, or other Page permissions and require `meta_list_pages` first to cache Page tokens.
- Instagram and Threads permissions are not required for the core Facebook Ads and Commerce scope.

For assets owned and managed by the app's own business/app-role users, Standard Access may be sufficient. Managing other businesses' ad accounts requires Advanced Access for the applicable Ads permissions and may require Business Verification and App Review. Meta distinguishes the `ads_management` permission from the separate Marketing API access tier used for higher-scale access and quotas. Confirm the current requirements in the [Meta app dashboard](https://developers.facebook.com/apps/) before production rollout.

### Token choice

- Local development: a user token generated for the Silvermine app, exchanged for a long-lived token.
- Durable internal automation: a system-user token created in Business Settings, with the app, ad account, catalog, pixel, and other required assets explicitly assigned to that system user.

The runtime does not require the Meta App ID or App Secret as environment variables. Those values are needed only during Meta's token issuance/exchange flows and must remain in a secret manager.

Runtime variables:

| Variable | Requirement |
|---|---|
| `META_ACCESS_TOKEN` | Required for Ads, Commerce, Business Manager, Pages, Instagram, Insights, Audiences, and Conversions API calls. |
| `THREADS_ACCESS_TOKEN` | Optional; only needed for Threads tools. |

The server also has a 1Password fallback for these exact references:

```text
op://Development/Meta Access Token/credential
op://Development/Threads Access Token/credential
```

The 1Password fallback is optional and not configured on this Mac. If the CLI has no configured accounts, the server now skips the fallback without prompting. Do not paste a token into chat, commit it, or add it to a tracked file.

## API version

`src/constants.ts` pins `GRAPH_API_VERSION` to `v26.0`, matching the current major version in [Meta Developer News](https://developers.meta.com/blog/) and Meta's [official Node.js Business SDK](https://github.com/facebook/facebook-nodejs-business-sdk/blob/main/package.json).

The `meta_list_products` implementation still uses Meta's documented `/{catalog_id}/products` edge for non-empty catalogs. It first checks catalog metadata and returns an empty result without calling that edge when `product_count` is zero. This handles Meta error `3/1798083` on empty generic catalogs without hiding errors on non-empty catalogs.

## Verification completed

```text
npm ci                         PASS (155 packages installed)
npm run build                  PASS (TypeScript compilation)
npm test                       PASS (62 tests across 5 files)
MCP initialize                 PASS
MCP tools/list                 PASS (200 tools)
Ads registrations              PASS (62 tools: 37 read-only, 25 write-capable, 6 destructive)
Commerce registrations         PASS (10 tools: 6 read-only, 4 write-capable, 1 destructive)
meta_debug_token               PASS (valid non-expiring system-user token)
meta_list_ad_accounts          PASS (7 accessible accounts)
meta_list_campaigns            PASS (Tutu School account; campaigns returned)
meta_list_product_catalogs     PASS (Silvermine business; 1 generic catalog, 0 products)
meta_list_product_sets         PASS (1 product set, 0 products)
meta_list_product_feeds        PASS (valid empty result)
meta_list_products             PASS (empty generic catalog returns no products)
Ads create/update/read/delete  PASS (temporary PAUSED campaign; deleted after verification)
Commerce product create       BLOCKED SAFELY (generic catalog does not support catalog items; no product created)
```

The verified Tutu School Ads account is `act_1189327436093349`, owned by Silvermine AI LLC business `815891927273222`. The verified catalog is `25720557404289037`; it currently contains no products.

During the first campaign JSON call, Meta returned the access token inside `paging.next`. The server no longer returns that credential. Rotation was recommended; the user elected to retain the existing token.

Representative exposed read-only tools include:

- `meta_list_ad_accounts`
- `meta_list_campaigns`
- `meta_get_campaign`
- `meta_get_ad_account`
- `meta_list_product_catalogs`
- `meta_list_products`
- `meta_list_product_sets`
- `meta_list_product_feeds`

Write and destructive tools are exposed. A temporary campaign was created in `PAUSED` status without a budget or ad set, renamed, read back, and deleted. It could not spend. A temporary out-of-stock Commerce product creation was also attempted, but Meta rejected it before creation because the available catalog uses the `generic` vertical, which does not support catalog items.

## Acceptance result

The requested local/dev endpoint is complete: requirements and authentication are documented, the server builds and exposes its tool catalog, Meta authentication succeeds, representative Ads and Commerce reads work on Graph API v26, and the Ads write lifecycle is verified with cleanup.

Recommended follow-ups, outside this endpoint's acceptance criteria:

1. Create or assign a Commerce-capable catalog before relying on product create/update/delete tools; the currently assigned `generic` catalog cannot contain catalog items.
2. Expand v26 compatibility testing to tool families that were not exercised in this representative pass.
3. Rotate the previously exposed token if the security decision changes.
