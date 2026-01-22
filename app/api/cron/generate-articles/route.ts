import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateArticle } from '@/lib/generate-article';

const POLYMARKET_API = 'https://gamma-api.polymarket.com/markets';

const SPORTS_KEYWORDS = [
    'nba', 'nfl', 'mlb', 'nhl', 'mls', 'premier league', 'champions league',
    'world cup', 'super bowl', 'world series', 'stanley cup', 'playoffs',
    'championship', 'tournament', 'football', 'basketball', 'baseball',
    'hockey', 'soccer', 'tennis', 'golf', 'boxing', 'ufc', 'mma',
    'olympics', 'grand slam', 'f1', 'formula 1', 'nascar', 'cricket',
    'rugby', 'mvp', 'all-star', 'draft', 'trade deadline',
  ];

function isSportsMarket(title: string, description: string): boolean {
    const text = (title + ' ' + description).toLowerCase();
    return SPORTS_KEYWORDS.some(keyword => text.includes(keyword));
}

function categorizeMarket(title: string): string {
    const t = title.toLowerCase();
    if (t.includes('trump') || t.includes('biden') || t.includes('election') || t.includes('congress') || t.includes('senate')) return 'Politics';
    if (t.includes('ai') || t.includes('tech') || t.includes('apple') || t.includes('google') || t.includes('microsoft')) return 'Technology';
    if (t.includes('crypto') || t.includes('bitcoin') || t.includes('ethereum') || t.includes('stock') || t.includes('fed')) return 'Finance';
    if (t.includes('war') || t.includes('ukraine') || t.includes('china') || t.includes('russia') || t.includes('nato')) return 'Geopolitics';
    if (t.includes('movie') || t.includes('oscar') || t.includes('grammy') || t.includes('celebrity')) return 'Entertainment';
    return 'General';
}

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'predicted-press-cron-2024';

  if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
        const response = await fetch(`${POLYMARKET_API}?limit=50&active=true&closed=false`);
        const markets = await response.json();

      const filtered = markets
          .filter((m: any) => !isSportsMarket(m.question || '', m.description || ''))
          .filter((m: any) => (m.volume || 0) >= 50000)
          .sort((a: any, b: any) => (b.volume || 0) - (a.volume || 0))
          .slice(0, 5);

      const results = [];

      for (const market of filtered) {
              const existing = await prisma.market.findFirst({
                        where: { polymarketId: market.id }
              });

          if (existing) {
                    results.push({ id: market.id, status: 'exists', title: market.question });
                    continue;
          }

          const category = categorizeMarket(market.question);
              const probability = Math.round((market.outcomePrices?.[0] || 0.5) * 100);

          const newMarket = await prisma.market.create({
                    data: {
                                polymarketId: market.id,
                                title: market.question,
                                description: market.description || '',
                                category,
                                currentProbability: probability,
                                volume: Math.round(market.volume || 0),
                                lastArticleProbability: probability,
                                lastArticleGeneratedAt: new Date(),
                    }
          });

          const article = await generateArticle(newMarket.id);
              results.push({ 
                                   id: market.id, 
                        status: 'created', 
                        title: market.question,
                        articleId: article?.id,
                        volume: market.volume
              });
      }

      return NextResponse.json({ 
                                     success: true, 
              timestamp: new Date().toISOString(),
              processed: results.length, 
              results 
      });
  } catch (error) {
        console.error('Cron error:', error);
        return NextResponse.json({ error: 'Failed to process markets', details: String(error) }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
