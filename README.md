# Morpholex

A word morphology search engine. Type any English word and get all its morphological transformations grouped by category: nouns, verbs, adjectives, adverbs, prefixed forms, and more. Powered by Google Gemini AI.

## Stack

- **Frontend**: React 19 + Vite, Tailwind CSS, Playfair Display / Inter fonts
- **Backend**: Express 5 locally, Netlify Functions in production
- **AI**: Google Gemini (`gemini-2.5-flash-lite`) via `@google/generative-ai`
- **Monorepo**: npm workspaces + TypeScript

## Getting Started

### Prerequisites

- Node.js 24+
- npm
- A Google AI Studio API key from https://aistudio.google.com/apikey

### Environment Variables

Create a `.env` file in the repo root:

```bash
GOOGLE_AI_API_KEY=your_key_here
PORT=8080
NODE_ENV=development
```

### Running Locally

```bash
npm install

# Start the API server
npm run dev:backend

# Start the frontend in a separate terminal
npm run dev:frontend
```

The frontend runs at `http://localhost:21707` and proxies API requests to `http://localhost:8080/api`.

### Other Commands

```bash
npm run typecheck                         # full typecheck across all packages
npm run build                             # typecheck + build all packages
npm run build:netlify                     # build the frontend for Netlify
npm run codegen                           # regenerate API hooks and Zod schemas from OpenAPI spec
```

## Project Structure

```txt
frontend/           React frontend, Vite config, generated React Query API client
backend/            Express API for local dev, Netlify Functions, OpenAPI spec/codegen
```

## Deploying to Netlify

This repo includes `netlify.toml`, so Netlify can deploy it from the repo root.

1. Push this branch to GitHub.
2. In Netlify, choose **Add new project** -> **Import an existing project**.
3. Connect the GitHub repo and select this branch.
4. Use these build settings:

```txt
Base directory: leave empty
Build command: npm run build:netlify
Publish directory: frontend/dist/public
Functions directory: backend/netlify/functions
```

5. Add this environment variable in Netlify:

```txt
GOOGLE_AI_API_KEY=your_key_here
```

6. Deploy the site.

The production API runs through Netlify Functions at `/api/healthz` and `/api/words/transform`, so the frontend can keep using `/api/...` requests without exposing the Gemini API key.
