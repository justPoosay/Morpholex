# Morpholex

A word morphology search engine. Type any English word and get all its morphological transformations grouped by category — nouns, verbs, adjectives, adverbs, prefixed forms, and more. Powered by Google Gemini AI.

## Stack

- **Frontend**: React 19 + Vite, Tailwind CSS, Playfair Display / Inter fonts
- **Backend**: Express 5, Node.js 24
- **AI**: Google Gemini (`gemini-2.5-flash-lite`) via `@google/generative-ai`
- **Database**: PostgreSQL + Drizzle ORM
- **Monorepo**: pnpm workspaces + TypeScript

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm
- A Google AI Studio API key (free at https://aistudio.google.com/apikey)
- A PostgreSQL database

### Environment Variables

Create a `.env` file in the repo root:

```
GOOGLE_AI_API_KEY=your_key_here
SESSION_SECRET=any_long_random_string
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

### Running Locally

```bash
pnpm install

# Start the API server
pnpm --filter @workspace/api-server run dev

# Start the frontend (separate terminal)
pnpm --filter @workspace/word-transformer run dev
```

The frontend runs at `http://localhost:<PORT>` and the API at `/api`.

### Other Commands

```bash
pnpm run typecheck                        # full typecheck across all packages
pnpm run build                            # typecheck + build all packages
pnpm --filter @workspace/api-spec run codegen  # regenerate API hooks from OpenAPI spec
pnpm --filter @workspace/db run push      # push DB schema changes (dev only)
```

## Project Structure

```
artifacts/
  api-server/       Express API (AI route, DB access)
  word-transformer/ React frontend
lib/
  api-spec/         OpenAPI spec + Orval codegen config
  api-client-react/ Generated React Query hooks
  api-zod/          Generated Zod schemas
  db/               Drizzle schema and client
scripts/            Shared utility scripts
```

## TODO

- Improve search time — the AI response latency is noticeable; explore caching results in the database so repeated lookups are instant.
- Add word definition by clicking a word — when a user clicks any word in the results, show its dictionary definition using a public English dictionary API (e.g. Free Dictionary API at `https://api.dictionaryapi.dev`).
