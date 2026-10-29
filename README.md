# Morpholex Dev ToDo

## Done

- [x] Rename the work branch to `dev`.
- [x] Replace runtime AI word transformation with a prebuilt Open English WordNet dictionary index.
- [x] Add a repeatable dictionary build script for regenerating the word-family index.
- [x] Add an irregular derivation overlay for families like `long`/`length`, `high`/`height`, and `wide`/`width`.
- [x] Prevent obvious generated double plurals such as `heightses`.
- [x] Remove AI provider dependency/config references from the backend path.
- [x] Disable the broken definition lookup flow while keeping the frontend definition files available for a possible future restore.
- [x] Smoke-test the Netlify deployment after the branch is deployed.
- [x] Fix page layout on mobile devices and different window sizes.
- [x] Add a small admin/dev stats page.
- [x] Prepare the admin panel analytics layout for future search data.
- [x] Add a shared query safety ruleset before database writes.
- [x] Add a Postgres `search_events` table and portable database layer.
- [x] Record safe search events from the backend transform endpoint.
- [x] Populate the admin panel with real search analytics from Postgres.
- [x] Improve admin analytics for debugging and remove obsolete lookup checks.
- [x] Replace the old orange-box logo with a transparent lexical-tree wordmark.
- [x] Widen the word families so derived words (`frequent` / `frequently`, `regular` / `irregular`, `memory` / `memorable`) share a family: hand-written sets plus spelling rules in `backend/scripts/widen-word-families.mjs`. It runs as the last step of `npm run build:dictionary --workspace backend`; `npm run check:dictionary --workspace backend` checks that typical derivations are linked.

## To Do

- No open items right now.

## iOS app

A native SwiftUI version of Morpholex lives in [`ios/`](ios/) (branch `swift`). It is built
with [xtool](https://xtool.sh), so no Mac is needed. See [`ios/README.md`](ios/README.md) for
the setup, the layout and what each script does.

| Task | Command |
| --- | --- |
| Build and install on a connected iPhone (Windows, one click) | Double-click `ios\scripts\build-and-install.cmd` |
| Build and install on a connected iPhone (any system) | `cd ios && xtool dev` |
| Rebuild the dictionary bundled in the app | `node ios/scripts/build-dictionary.mjs <count_1w.txt>` (see [`ios/README.md`](ios/README.md#rebuilding-the-dictionary)) |
