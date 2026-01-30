# BookVault

A social book library application for managing and sharing your digital book collection.

## Features

- Upload and organize EPUB and PDF books
- AI-powered metadata extraction (title, author, genre, language)
- Share your library with friends via invite links
- Track reading progress with status and percentage
- Multiple file versions per book (different languages/formats)
- Dark/Light/System theme support
- Multi-language UI (Portuguese/English)

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **UI:** shadcn/ui, Tailwind CSS, Radix UI
- **Backend:** Supabase (Auth, PostgreSQL, Edge Functions, Storage)
- **State:** TanStack React Query, React Context

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Supabase account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/tanmald/bookvault.git
   cd bookvault
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

   The app will be available at http://localhost:8080

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |

### Edge Function Secrets (set in Supabase Dashboard)

| Secret | Description |
|--------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for AI metadata extraction |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

### Netlify

1. Connect your GitHub repository to Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Set environment variables in Netlify dashboard

## Supabase Setup

The app requires a Supabase project with:
- Authentication (email/password)
- Database with migrations applied (see `supabase/migrations/`)
- Storage buckets: `books`, `covers`, `avatars`
- Edge function: `extract-metadata`

To deploy the edge function:
```bash
supabase functions deploy extract-metadata
supabase secrets set OPENAI_API_KEY=sk-your-key
```

## License

MIT
