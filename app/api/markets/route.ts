import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { fetchMarkets, getTrendingMarkets } from '@/lib/polymarket';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const sort = searchParams.get('sort') || 'volume';
    const limit = parseInt(searchParams.get('limit') || '20');
    const trending = searchParams.get('trending') === 'true';

  try {
        let markets;

      if (trending) {
              markets = await getTrendingMarkets(limit);
      } else {
              markets = await fetchMarkets(limit * 2); // Fetch extra for filtering
      }

      // Filter by category if specified
      if (category && category !== 'All') {
              markets = markets.filter((m: any) => m.category === category);
      }

      // Sort
      if (sort === 'volume') {
              markets.sort((a: any, b: any) => b.volume - a.volume);
      } else if (sort === 'probability') {
              markets.sort((a: any, b: any) => b.probability - a.probability);
      }

      // Limit results
      markets = markets.slice(0, limit);

      return NextResponse.json({
              markets,
              count: markets.length,
              timestamp: new Date().toISOString(),
      });
  } catch (error) {
        console.error('Failed to fetch markets:', error);
        return NextResponse.json(
          { error: 'Failed to fetch markets' },
          { status: 500 }
              );
  }
}
