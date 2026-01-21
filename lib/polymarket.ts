/**
 * Polymarket API Integration
 *
 * Polymarket uses a CLOB (Central Limit Order Book) API.
 * Docs: https://docs.polymarket.com/
 */

import { z } from 'zod';

const POLYMARKET_API = 'https://clob.polymarket.com';
const GAMMA_API = 'https://gamma-api.polymarket.com';

// Schema for market data
export const MarketSchema = z.object({
  id: z.string(),
  question: z.string(),
  slug: z.string().optional(),
  conditionId: z.string(),
  outcomes: z.array(z.string()),
  outcomePrices: z.array(z.string()),
  volume: z.string(),
  liquidity: z.string(),
  endDate: z.string().optional(),
  category: z.string().optional(),
  active: z.boolean(),
  closed: z.boolean(),
});

export type PolymarketMarket = z.infer<typeof MarketSchema>;

// Transformed market for our app
export interface Market {
  id: string;
  title: string;
  slug: string;
  probability: number;
  volume: number;
  liquidity: number;
  endDate: string | null;
  category: string;
  source: 'polymarket';
  outcomes: {
    name: string;
    price: number;
  }[];
  lastUpdated: Date;
}

/**
 * Fetch active markets from Polymarket
 */
export async function fetchMarkets(limit = 50): Promise<Market[]> {
  try {
    // Use the Gamma API for easier market discovery
    const response = await fetch(
      `${GAMMA_API}/markets?closed=false&active=true&limit=${limit}&order=volume&ascending=false`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 60 }, // Cache for 60 seconds
      }
    );

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status}`);
    }

    const data = await response.json();

    return data.map((market: any) => transformMarket(market)).filter(Boolean);
  } catch (error) {
    console.error('Failed to fetch Polymarket data:', error);
    return [];
  }
}

/**
 * Fetch a single market by ID or slug
 */
export async function fetchMarket(slugOrId: string): Promise<Market | null> {
  try {
    const response = await fetch(
      `${GAMMA_API}/markets/${slugOrId}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 30 },
      }
    );

    if (!response.ok) {
      return null;
    }

    const market = await response.json();
    return transformMarket(market);
  } catch (error) {
    console.error('Failed to fetch market:', error);
    return null;
  }
}

/**
 * Fetch price history for a market
 */
export async function fetchPriceHistory(
  conditionId: string,
  days = 30
): Promise<{ date: string; probability: number }[]> {
  try {
    const endTs = Math.floor(Date.now() / 1000);
    const startTs = endTs - (days * 24 * 60 * 60);

    const response = await fetch(
      `${POLYMARKET_API}/prices-history?market=${conditionId}&startTs=${startTs}&endTs=${endTs}&fidelity=60`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    return data.history?.map((point: any) => ({
      date: new Date(point.t * 1000).toISOString(),
      probability: Math.round(parseFloat(point.p) * 100),
    })) || [];
  } catch (error) {
    console.error('Failed to fetch price history:', error);
    return [];
  }
}

/**
 * Transform raw Polymarket data to our format
 */
function transformMarket(raw: any): Market | null {
  try {
    const outcomePrices = raw.outcomePrices || raw.outcomes?.map((o: any) => o.price) || [];
    const yesPrice = parseFloat(outcomePrices[0] || '0.5');

    return {
      id: raw.id || raw.conditionId,
      title: raw.question || raw.title,
      slug: raw.slug || raw.id,
      probability: Math.round(yesPrice * 100),
      volume: parseFloat(raw.volume || raw.volumeNum || '0'),
      liquidity: parseFloat(raw.liquidity || raw.liquidityNum || '0'),
      endDate: raw.endDate || raw.endDateIso || null,
      category: categorizeMarket(raw.question || raw.title),
      source: 'polymarket',
      outcomes: (raw.outcomes || ['Yes', 'No']).map((name: string, i: number) => ({
        name,
        price: parseFloat(outcomePrices[i] || '0.5'),
      })),
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error('Failed to transform market:', raw, error);
    return null;
  }
}

/**
 * Auto-categorize markets based on keywords
 */
function categorizeMarket(title: string): string {
  const lower = title.toLowerCase();

  if (lower.includes('trump') || lower.includes('biden') || lower.includes('election') ||
      lower.includes('president') || lower.includes('congress') || lower.includes('senate')) {
    return 'Politics';
  }
  if (lower.includes('ai') || lower.includes('openai') || lower.includes('google') ||
      lower.includes('apple') || lower.includes('tesla') || lower.includes('tech')) {
    return 'Technology';
  }
  if (lower.includes('fed') || lower.includes('interest rate') || lower.includes('inflation') ||
      lower.includes('gdp') || lower.includes('recession')) {
    return 'Economics';
  }
  if (lower.includes('bitcoin') || lower.includes('crypto') || lower.includes('ethereum') ||
      lower.includes('stock') || lower.includes('market')) {
    return 'Markets';
  }
  if (lower.includes('war') || lower.includes('ukraine') || lower.includes('china') ||
      lower.includes('russia') || lower.includes('nato')) {
    return 'Geopolitics';
  }
  if (lower.includes('nba') || lower.includes('nfl') || lower.includes('championship') ||
      lower.includes('super bowl') || lower.includes('world cup')) {
    return 'Sports';
  }
  if (lower.includes('oscar') || lower.includes('grammy') || lower.includes('movie') ||
      lower.includes('album') || lower.includes('celebrity')) {
    return 'Culture';
  }

  return 'General';
}

/**
 * Get trending markets (biggest 24h movers)
 * Note: This requires storing historical data to calculate changes
 */
export async function getTrendingMarkets(limit = 10): Promise<Market[]> {
  const markets = await fetchMarkets(100);

  // For now, just return by volume since we need historical data for true trending
  return markets
    .sort((a, b) => b.volume - a.volume)
    .slice(0, limit);
}
