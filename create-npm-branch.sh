#!/usr/bin/env bash
# ============================================================
# Morpholex — Create the "npm" branch
# Run this script locally after cloning the repo:
#   git clone https://github.com/justPoosay/Morpholex
#   cd Morpholex
#   bash create-npm-branch.sh
# ============================================================
set -e

echo "Creating npm branch..."
git checkout -b npm

# ============================================================
# 1. Root package.json — add workspaces, remove pnpm guard
# ============================================================
cat > package.json << 'EOF'
{
  "name": "workspace",
  "version": "0.0.0",
  "license": "MIT",
  "workspaces": [
    "artifacts/*",
    "lib/*",
    "scripts"
  ],
  "scripts": {
    "build": "npm run typecheck && npm run build --workspaces --if-present",
    "typecheck:libs": "tsc --build",
    "typecheck": "npm run typecheck:libs && npm run typecheck --workspaces --if-present"
  },
  "private": true,
  "devDependencies": {
    "typescript": "~5.9.2",
    "prettier": "^3.8.1"
  }
}
EOF

# ============================================================
# 2. artifacts/api-server/package.json
# ============================================================
cat > artifacts/api-server/package.json << 'EOF'
{
  "name": "@workspace/api-server",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "export NODE_ENV=development && npm run build && npm run start",
    "build": "node ./build.mjs",
    "start": "node --enable-source-maps ./dist/index.mjs",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@google/generative-ai": "^0.24.1",
    "@workspace/api-zod": "*",
    "@workspace/db": "*",
    "@workspace/integrations-openai-ai-server": "*",
    "cookie-parser": "^1.4.7",
    "cors": "^2",
    "drizzle-orm": "^0.45.2",
    "express": "^5",
    "pino": "^9",
    "pino-http": "^10"
  },
  "devDependencies": {
    "@types/cookie-parser": "^1.4.10",
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.6",
    "@types/node": "^25.3.3",
    "esbuild": "^0.27.3",
    "esbuild-plugin-pino": "^2.3.3",
    "pino-pretty": "^13",
    "thread-stream": "3.1.0"
  }
}
EOF

# ============================================================
# 3. artifacts/word-transformer/package.json
# ============================================================
cat > artifacts/word-transformer/package.json << 'EOF'
{
  "name": "@workspace/word-transformer",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --config vite.config.ts --host 0.0.0.0",
    "build": "vite build --config vite.config.ts",
    "serve": "vite preview --config vite.config.ts --host 0.0.0.0",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": {
    "@hookform/resolvers": "^3.10.0",
    "@radix-ui/react-accordion": "^1.2.4",
    "@radix-ui/react-alert-dialog": "^1.1.7",
    "@radix-ui/react-aspect-ratio": "^1.1.3",
    "@radix-ui/react-avatar": "^1.1.4",
    "@radix-ui/react-checkbox": "^1.1.5",
    "@radix-ui/react-collapsible": "^1.1.4",
    "@radix-ui/react-context-menu": "^2.2.7",
    "@radix-ui/react-dialog": "^1.1.7",
    "@radix-ui/react-dropdown-menu": "^2.1.7",
    "@radix-ui/react-hover-card": "^1.1.7",
    "@radix-ui/react-label": "^2.1.3",
    "@radix-ui/react-menubar": "^1.1.7",
    "@radix-ui/react-navigation-menu": "^1.2.6",
    "@radix-ui/react-popover": "^1.1.7",
    "@radix-ui/react-progress": "^1.1.3",
    "@radix-ui/react-radio-group": "^1.2.4",
    "@radix-ui/react-scroll-area": "^1.2.4",
    "@radix-ui/react-select": "^2.1.7",
    "@radix-ui/react-separator": "^1.1.3",
    "@radix-ui/react-slider": "^1.2.4",
    "@radix-ui/react-slot": "^1.2.0",
    "@radix-ui/react-switch": "^1.1.4",
    "@radix-ui/react-tabs": "^1.1.4",
    "@radix-ui/react-toast": "^1.2.7",
    "@radix-ui/react-toggle": "^1.1.3",
    "@radix-ui/react-toggle-group": "^1.1.3",
    "@radix-ui/react-tooltip": "^1.2.0",
    "@replit/vite-plugin-cartographer": "^0.5.1",
    "@replit/vite-plugin-dev-banner": "^0.1.1",
    "@replit/vite-plugin-runtime-error-modal": "^0.0.6",
    "@tailwindcss/typography": "^0.5.15",
    "@tailwindcss/vite": "^4.1.14",
    "@tanstack/react-query": "^5.90.21",
    "@types/node": "^25.3.3",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@vitejs/plugin-react": "^5.0.4",
    "@workspace/api-client-react": "*",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "date-fns": "^3.6.0",
    "embla-carousel-react": "^8.6.0",
    "framer-motion": "^12.23.24",
    "input-otp": "^1.4.2",
    "lucide-react": "^0.545.0",
    "next-themes": "^0.4.6",
    "react": "19.1.0",
    "react-day-picker": "^9.11.1",
    "react-dom": "19.1.0",
    "react-hook-form": "^7.55.0",
    "react-icons": "^5.4.0",
    "react-resizable-panels": "^2.1.7",
    "recharts": "^2.15.2",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.3.1",
    "tailwindcss": "^4.1.14",
    "tw-animate-css": "^1.4.0",
    "vaul": "^1.1.2",
    "vite": "^7.3.2",
    "wouter": "^3.3.5",
    "zod": "^3.25.76"
  }
}
EOF

# ============================================================
# 4. lib/api-zod/package.json
# ============================================================
cat > lib/api-zod/package.json << 'EOF'
{
  "name": "@workspace/api-zod",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "zod": "^3.25.76"
  }
}
EOF

# ============================================================
# 5. lib/api-client-react/package.json
# ============================================================
cat > lib/api-client-react/package.json << 'EOF'
{
  "name": "@workspace/api-client-react",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.90.21"
  },
  "peerDependencies": {
    "react": ">=18"
  }
}
EOF

# ============================================================
# 6. lib/db/package.json
# ============================================================
cat > lib/db/package.json << 'EOF'
{
  "name": "@workspace/db",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema/index.ts"
  },
  "scripts": {
    "push": "drizzle-kit push --config ./drizzle.config.ts",
    "push-force": "drizzle-kit push --force --config ./drizzle.config.ts"
  },
  "dependencies": {
    "drizzle-orm": "^0.45.2",
    "drizzle-zod": "^0.8.3",
    "pg": "^8.20.0",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@types/node": "^25.3.3",
    "@types/pg": "^8.18.0",
    "drizzle-kit": "^0.31.9"
  }
}
EOF

# ============================================================
# 7. lib/api-spec/package.json
# ============================================================
cat > lib/api-spec/package.json << 'EOF'
{
  "name": "@workspace/api-spec",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "codegen": "orval --config ./orval.config.ts && npm run typecheck:libs --prefix ../.."
  },
  "devDependencies": {
    "orval": "^8.5.2"
  }
}
EOF

# ============================================================
# 8. scripts/package.json
# ============================================================
cat > scripts/package.json << 'EOF'
{
  "name": "@workspace/scripts",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "hello": "tsx ./src/hello.ts",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": {
    "@types/node": "^25.3.3",
    "tsx": "^4.21.0"
  }
}
EOF

# ============================================================
# 9. artifacts/mockup-sandbox/package.json
# ============================================================
cat > artifacts/mockup-sandbox/package.json << 'EOF'
{
  "name": "@workspace/mockup-sandbox",
  "version": "2.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": {
    "@hookform/resolvers": "^3.10.0",
    "@radix-ui/react-accordion": "^1.2.12",
    "@radix-ui/react-alert-dialog": "^1.1.15",
    "@radix-ui/react-aspect-ratio": "^1.1.8",
    "@radix-ui/react-avatar": "^1.1.11",
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-collapsible": "^1.1.12",
    "@radix-ui/react-context-menu": "^2.2.16",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-hover-card": "^1.1.15",
    "@radix-ui/react-label": "^2.1.8",
    "@radix-ui/react-menubar": "^1.1.16",
    "@radix-ui/react-navigation-menu": "^1.2.14",
    "@radix-ui/react-popover": "^1.1.15",
    "@radix-ui/react-progress": "^1.1.8",
    "@radix-ui/react-radio-group": "^1.3.8",
    "@radix-ui/react-scroll-area": "^1.2.10",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-separator": "^1.1.8",
    "@radix-ui/react-slider": "^1.3.6",
    "@radix-ui/react-slot": "^1.2.4",
    "@radix-ui/react-switch": "^1.2.6",
    "@radix-ui/react-tabs": "^1.1.13",
    "@radix-ui/react-toast": "^1.2.7",
    "@radix-ui/react-toggle": "^1.1.10",
    "@radix-ui/react-toggle-group": "^1.1.11",
    "@radix-ui/react-tooltip": "^1.2.8",
    "@replit/vite-plugin-cartographer": "^0.5.1",
    "@replit/vite-plugin-runtime-error-modal": "^0.0.6",
    "@tailwindcss/vite": "^4.1.14",
    "@types/node": "^25.3.3",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@vitejs/plugin-react": "^5.0.4",
    "chokidar": "^4.0.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "date-fns": "^3.6.0",
    "embla-carousel-react": "^8.6.0",
    "fast-glob": "^3.3.3",
    "framer-motion": "^12.23.24",
    "input-otp": "^1.4.2",
    "lucide-react": "^0.545.0",
    "next-themes": "^0.4.6",
    "react": "19.1.0",
    "react-day-picker": "^9.11.1",
    "react-dom": "19.1.0",
    "react-hook-form": "^7.66.0",
    "react-resizable-panels": "^2.1.9",
    "recharts": "^2.15.4",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.3.1",
    "tailwindcss": "^4.1.14",
    "tailwindcss-animate": "^1.0.7",
    "tw-animate-css": "^1.4.0",
    "vaul": "^1.1.2",
    "vite": "^7.3.2",
    "zod": "^3.25.76"
  }
}
EOF

# ============================================================
# 10. scripts/post-merge.sh — switch pnpm to npm
# ============================================================
cat > scripts/post-merge.sh << 'EOF'
#!/bin/bash
set -e
npm install
npm run push --workspace=@workspace/db
EOF
chmod +x scripts/post-merge.sh

# ============================================================
# 11. lib/integrations-openai-ai-server/package.json — no changes needed
# 12. lib/integrations-openai-ai-react/package.json — no changes needed
# ============================================================

# ============================================================
# 13. Remove pnpm-specific files
# ============================================================
echo "Removing pnpm files..."
rm -f pnpm-workspace.yaml
rm -f pnpm-lock.yaml

# ============================================================
# 12. Create .env.example
# ============================================================
cat > .env.example << 'EOF'
# Google AI Studio API key — get one free at https://aistudio.google.com/apikey
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# Any long random string — used to sign sessions
SESSION_SECRET=replace_with_a_long_random_string
EOF

# ============================================================
# 13. Install dependencies with npm
# ============================================================
echo "Running npm install..."
npm install

# ============================================================
# 14. Commit and push
# ============================================================
echo "Committing and pushing..."
git add -A
git commit -m "chore: migrate from pnpm to npm workspaces

- Replace pnpm-workspace.yaml with npm workspaces in root package.json
- Expand all catalog: references to explicit version numbers
- Replace workspace:* references with * (npm workspace protocol)
- Remove pnpm preinstall guard from root package.json
- Remove pnpm-workspace.yaml and pnpm-lock.yaml
- Update scripts: pnpm --filter → npm run --workspace
- Add .env.example with required environment variables"

git push origin npm

echo ""
echo "Done! The 'npm' branch is now on GitHub."
echo "To start the project locally:"
echo "  cp .env.example .env   # then fill in your values"
echo "  npm install"
echo "  cd artifacts/api-server && npm run dev"
echo "  cd artifacts/word-transformer && npm run dev"
