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

## To Do

- No open items right now.
