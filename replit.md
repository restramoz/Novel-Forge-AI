# Workspace

## Overview

Novel AI - Platform full-stack untuk membuat dan membaca novel yang digenerate oleh AI menggunakan Ollama. pnpm workspace monorepo menggunakan TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, Tailwind CSS, Shadcn UI, react-query
- **AI**: Ollama (via ollama.com cloud API)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── novel-ai/           # React + Vite frontend (Novel AI)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Novel AI Features

- **Homepage**: Daftar novel dengan filter genre, pencarian, pagination
- **Create Novel**: Form buat novel baru (judul, genre, sinopsis, tags, bahasa, model Ollama, gaya penulisan)
- **Novel Detail**: Detail novel, daftar bab, generate bab berikutnya
- **AI Generate**: Streaming SSE real-time dari Ollama, bab panjang 2000+ kata
- **Chapter Reader**: One-page reader, semua bab, TOC sidebar, progress bar, font serif elegan
- **CRUD**: Create/Edit/Delete novel dan bab
- **Dark/Light mode**: Toggle persisten

## API Routes

- `GET /api/novels` - list novels (filter: genre, search, page, limit)
- `POST /api/novels` - create novel
- `GET /api/novels/:id` - get novel
- `PUT /api/novels/:id` - update novel
- `DELETE /api/novels/:id` - delete novel
- `GET /api/novels/:id/chapters` - list chapters
- `POST /api/novels/:id/chapters` - create chapter
- `GET /api/novels/:id/chapters/:chapterId` - get chapter
- `PUT /api/novels/:id/chapters/:chapterId` - update chapter
- `DELETE /api/novels/:id/chapters/:chapterId` - delete chapter
- `POST /api/novels/:id/generate-stream` - SSE streaming AI generation
- `POST /api/novels/:id/generate` - non-streaming AI generation
- `GET /api/models` - list Ollama models

## Database Schema

- `novels` - Novel table (id, title, synopsis, genre, tags, language, model, writingStyle, targetChapters, chapterCount, wordCount, status, coverImage, timestamps)
- `chapters` - Chapter table (id, novelId, chapterNumber, title, content, wordCount, isGenerated, generationPrompt, timestamps)

## Ollama Integration

- Host: https://ollama.com
- API Key: stored in OLLAMA_API_KEY env var (fallback in code)
- Streaming: SSE via /api/chat endpoint
- Default model: llama3.2
