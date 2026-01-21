# Predicted Press

**Probability led press** - A next-generation publication that transforms prediction market data into news articles.

## Quick Start

### 1. Prerequisites

- Node.js 18+
- A Vercel account (free tier works)
- Anthropic API key (for article generation)

### 2. Clone and Install

```bash
git clone <your-repo>
cd predicted-press
npm install
```

### 3. Environment Setup

Create a `.env` file:

```env
# Database (SQLite for dev, PostgreSQL for prod)
DATABASE_URL="file:./dev.db"

# For production on Vercel, use:
# DATABASE_URL="postgresql://user:pass@host:5432/predicted_press"

# Anthropic API for article generation
ANTHROPIC_API_KEY="sk-ant-..."

# Optional: Analytics
NEXT_PUBLIC_GA_ID="G-..."
```

### 4. Initialize Database

```bash
npx prisma db push
npx prisma generate
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Production Deployment (Vercel)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo>
git push -u origin main
```

### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Add environment variables:
   - `DATABASE_URL` - Your PostgreSQL connection string (use [Neon](https://neon.tech), [Supabase](https://supabase.com), or [PlanetScale](https://planetscale.com) for free)
   - `ANTHROPIC_API_KEY` - Your Claude API key

### 3. Set Up Cron Jobs

For automated market syncing, use Vercel Cron:

Create `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-markets",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/generate-drafts",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

---

## Architecture

```
predicted-press/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── markets/       # Live market data
│   │   ├── articles/      # Article CRUD
│   │   └── bounties/      # Bounty system
│   ├── (public)/          # Public pages
│   └── admin/             # Admin CMS
├── components/            # React components
├── lib/                   # Core libraries
│   ├── polymarket.ts      # Polymarket API client
│   ├── generate-article.ts # Claude article generation
│   └── prisma.ts          # Database client
├── prisma/
│   └── schema.prisma      # Database schema
└── scripts/               # CLI scripts
    ├── sync-markets.ts    # Market data sync
    └── generate-articles.ts # Batch article generation
```

---

## Data Flow

### 1. Market Sync (every 5 min)
```
Polymarket API → sync-markets.ts → Database
                                  ↓
                     Auto-create bounties for big moves
```

### 2. Article Generation (Hybrid)
```
Open Bounty → AI generates draft → Journalist claims → Enhances draft → Editorial review → Published
```

### 3. Revenue Flow
```
Article View → Affiliate Link Click → Polymarket → Commission
            → Subscription CTA → Stripe → Recurring Revenue
            → Ad Impression → Programmatic → CPM Revenue
```

---

## Key Features

### For Readers
- Probability-first headlines
- Live market data integration
- Historical probability charts
- Email alerts for significant moves

### For Journalists
- Bounty marketplace
- AI-generated starting drafts
- Performance-based bonuses
- Reputation system

### For Publishers
- Automated bounty creation
- Editorial workflow
- Revenue analytics
- Affiliate tracking

---

## API Reference

### GET /api/markets
Fetch live prediction markets.

```typescript
// Query params
?category=Politics|Technology|Economics|...
&sort=volume|probability
&limit=20
&trending=true

// Response
{
  "markets": [...],
  "count": 20,
  "timestamp": "2024-..."
}
```

### GET /api/articles
Fetch published articles.

```typescript
// Query params
?category=Politics
&limit=20
&offset=0

// Response
{
  "articles": [...],
  "total": 100,
  "hasMore": true
}
```

### GET /api/bounties
Fetch available bounties.

```typescript
// Query params
?status=OPEN|CLAIMED|all
&category=Politics
&sort=reward|deadline|recent

// Response
{
  "bounties": [...]
}
```

---

## Costs

### Free Tier Friendly
- **Vercel**: Free for hobby projects
- **Database**: Neon/Supabase free tier (sufficient for MVP)
- **Polymarket API**: Free, no API key needed

### Variable Costs
- **Anthropic API**: ~$0.003-0.015 per article draft
- **At 50 articles/day**: ~$5-20/month

### Revenue Potential
- Affiliate commissions: 10-30% of referred volume
- Subscriptions: $10-79/user/month
- Display ads: $5-15 CPM

---

## Next Steps

1. **Deploy MVP** - Get it live on Vercel
2. **Seed initial articles** - Generate 10-20 articles for launch content
3. **Set up affiliate tracking** - Contact Polymarket about affiliate program
4. **Recruit writers** - Post bounty board on journalism communities
5. **Launch newsletter** - Start building email list

---

## Support

Questions? Ideas? Open an issue or reach out.

Built with ❤️ by the Predicted Press team.
