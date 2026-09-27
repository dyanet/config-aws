# config-aws monorepo: notes for agents and maintainers

npm workspaces monorepo: `packages/config-aws` (`@dyanet/config-aws`, the core), `packages/nestjs-config-aws` and `packages/nextjs-config-aws` (adapters). Node ≥20.

## Releasing

Releases are cut by **merging a version bump**, never by hand-publishing.

1. In a PR, bump `version` in `package.json` of **each package that changed** and update the changelog/README if user-facing.
2. Merge to `main` (`publish.yml` runs on `main` and on `v*` tags only). The release job in `.github/workflows/publish.yml` then:
   - skips if this version has already been released (the git tag `<name>@<version>` exists) or npm already has that version or newer;
   - **stages** the version on **npmjs** with `npm stage publish --provenance`, authenticated by **npm Trusted Publishing (OIDC)**. No `NPM_TOKEN` is used.
   - pushes the tag `<name>@<version>` (this is what stops a re-stage on later pushes).
3. A maintainer **approves** the staged version on npmjs.com → **Staged Packages** → Approve (2FA), or `npm stage approve <stage-id>` (IDs: `npm stage list`, or the job log). Nothing is live on npm until then.

Details:
- **Trusted publisher** (npmjs.com → package → Settings → Trusted publishing → GitHub Actions): org `dyanet`, repo `config-aws`, workflow `publish.yml`, environment `prod`. It allows **staging only**. A plain `npm publish` from CI fails with `403 OIDC permission denied for this action`, so keep `npm stage publish`.
- **dist-tags:** every staged version currently gets `latest` (the `v<major>` logic used in the other dyanet repos isn't in `publish.yml` yet; add it before releasing an older line).
- `npm stage` needs a current npm, so the job runs `npm install -g npm@latest`. `npm stage list` needs a logged-in user, so CI can't use it; the git tag is the only "already staged" marker.
- Automated sessions (Claude Code on the web) **cannot push tags or create GitHub releases** (403). That is why releasing is merge-driven. Branches can be pushed.
- The npmjs.com package page caches dist-tags; check with `npm view <pkg> dist-tags`.

## Monthly security pass

- **Find advisories with `npm audit`** (plus `npm audit --omit=dev` for what ships). The Claude GitHub App cannot read the Dependabot alerts API (403).
- **Update to the latest compatible version**: `npm update` within ranges first, then raise ranges where needed. Dev tooling may move majors only if `engines.node` still holds (check the tool's own `engines`). Runtime dependencies stay within the declared `engines` and peer ranges unless a breaking release is intended.
- Supersede open Dependabot PRs with one PR, and close them with a comment naming the replacing PR.
- **Majors are deliberate.** `.github/dependabot.yml` ignores `semver-major` version updates (security updates still arrive). Evaluate majors during this pass.
- Run build, lint and tests, and **add tests** for the least-covered code. Prefer tests that exercise real integration points (packed tarballs, real sockets, the real base class) over pure mocks; that is how this pass found real bugs. Confirm a regression test fails on the old code.
- Bump the version, merge, and let the release job stage it (see Releasing).
- Record the pass in the "Monthly sec updates" project notes.

## CI conventions

- The Node matrix covers every line allowed by `engines.node` (up to Current), with `fail-fast: false`.
- `npm audit --omit=dev --audit-level=high` gates CI on one matrix leg.
- `concurrency` cancels superseded CI runs. Publishing never runs concurrently and is never cancelled.
- Action versions: `actions/checkout@v7`, `actions/setup-node@v7`.

## Repo notes

- **One root lockfile.** npm workspaces install from the root `package-lock.json`. Don't add lockfiles inside `packages/*`: Dependabot opens duplicate PRs against them.
- **Adapters depend on the core** (`"@dyanet/config-aws": "^x.y.z"` in `dependencies`). When a core fix matters to adapter users, raise that range, bump the adapters too, and approve the **core first** on npmjs (until it's live, the adapters can't resolve it).
- **Optional AWS SDKs:** the loaders `import()` `@aws-sdk/client-*` lazily through `loadOptionalDependency`. Those imports must keep `/* webpackIgnore: true */ /* turbopackIgnore: true */`, or webpack/Turbopack fail to build apps that didn't install every SDK client. Don't put `*/` inside JSDoc examples.
- **nextjs-config-aws and React Server Components:** the main entry must import `getConfig` from `./server/get-config`, **not** `./server`. That barrel evaluates `config-provider`, which calls `React.createContext()` at load, and that crashes under RSC. Client components use the `@dyanet/nextjs-config-aws/client` subpath. `src/entrypoints.spec.ts` guards both.
- The `nextjs-example` CI job npm-packs the packages and runs `next build` on `examples/nextjs-basic` for Next 14 and 16 with **no AWS SDK installed**. It is the only test that catches bundler/RSC problems; keep it.
- The `.env` parser keeps values literally, quotes included (ECS env-file semantics).
- The core Jest coverage thresholds are 85/70/85/85; raise them when coverage rises.
- **NestJS 12** isn't supported yet: it's ESM-only and the Jest/CommonJS setup can't load it. The peer range stays `^10 || ^11` until the tests are migrated.
- `publish.yml` publishes to npmjs only (no GitHub Packages). Each package has its own job; the adapters' jobs run after the core's. Jobs use the `prod` environment, so GitHub may ask for approval if that environment has reviewers.

## Working-copy gotchas

- Some files are committed with **CRLF** line endings. Preserve each file's existing endings when editing (Python `open()` silently converts CRLF to LF; use `newline=''`).
- The maintainer's local checkouts are on Windows (`C:\work\dyanet\…`) and show whole-file CRLF/LF diffs. Don't run git inside the linked-folder mount from a remote session: it can't delete lock files and leaves `.git/index.lock` behind.
- Shallow single-branch clones need `git config remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*'` before other branches can be fetched or tracked.
