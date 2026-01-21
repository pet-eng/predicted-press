/**
 * Market Sync Script
 *
 * Run this on a schedule (e.g., every 5 minutes via cron) to:
 * 1. Fetch latest market data from Polymarket
 * 2. Update database with current prices
 * 3. Track price history for trend analysis
 * 4. Auto-create bounties for significant market moves
 *
 * Usage: npx tsx scripts/sync-markets.ts
 */

import { PrismaClient } from '@prisma/client';
import { fetchMarkets, fetchPriceHistory } from '../lib/polymarket';
import { generateBountyHeadline, generateBountyRequirements } from '../lib/generate-article';

const prisma = new PrismaClient();

// Thresholds for auto-creating bounties
const BOUNTY_THRESHOLDS = {
  MIN_VOLUME: 100000,        // $100k minimum volume
  PRICE_CHANGE_24H: 5,       // 5% change triggers bounty
  PRICE_CHANGE_7D: 10,       // 10% weekly change
  HIGH_VOLUME_MULTIPLIER: 1.5, // Bonus for high-volume markets
};

async function syncMarkets() {
  console.log('Starting market sync...');

  try {
    // 1. Fetch latest markets from Polymarket
    const markets = await fetchMarkets(100);
    console.log(`Fetched ${markets.length} markets from Polymarket`);

    for (const market of markets) {
      // 2. Upsert market in database
      const existingMarket = await prisma.market.findUnique({
        where: { id: market.id },
      });

      const previousProbability = existingMarket?.probability || market.probability;

      await prisma.market.upsert({
        where: { id: market.id },
        create: {
          id: market.id,
          title: market.title,
          slug: market.slug,
          probability: market.probability,
          volume: market.volume,
          liquidity: market.liquidity,
          endDate: market.endDate ? new Date(market.endDate) : null,
          category: market.category,
          source: market.source,
        },
        update: {
          probability: market.probability,
          volume: market.volume,
          liquidity: market.liquidity,
          lastSyncedAt: new Date(),
        },
      });

      // 3. Record price point for history
      await prisma.pricePoint.create({
        data: {
          marketId: market.id,
          probability: market.probability,
          volume: market.volume,
        },
      });

      // 4. Check if we should create a bounty
      const priceChange = Math.abs(market.probability - previousProbability);

      if (
        market.volume >= BOUNTY_THRESHOLDS.MIN_VOLUME &&
        priceChange >= BOUNTY_THRESHOLDS.PRICE_CHANGE_24H
      ) {
        await maybeCreateBounty(market, priceChange);
      }
    }

    // 5. Clean up old price points (keep last 30 days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    await prisma.pricePoint.deleteMany({
      where: {
        timestamp: { lt: cutoffDate },
      },
    });

    console.log('Market sync complete!');

  } catch (error) {
    console.error('Market sync failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function maybeCreateBounty(
  market: { id: string; title: string; probability: number; volume: number; category: string },
  priceChange: number
) {
  // Check if there's already an open bounty for this market
  const existingBounty = await prisma.bounty.findFirst({
    where: {
      marketId: market.id,
      status: { in: ['OPEN', 'CLAIMED', 'IN_PROGRESS'] },
    },
  });

  if (existingBounty) {
    console.log(`Bounty already exists for market: ${market.title}`);
    return;
  }

  // Calculate reward based on volume and movement
  let baseReward = 200; // Base $200

  if (market.volume >= 1000000) baseReward = 400;
  if (market.volume >= 5000000) baseReward = 600;
  if (market.volume >= 10000000) baseReward = 800;

  // Bonus for significant moves
  const moveMultiplier = 1 + (priceChange / 20); // +5% per point of movement
  baseReward = Math.round(baseReward * moveMultiplier);

  // Bonus pool based on projected revenue
  const bonusPool = Math.round(baseReward * 0.3);

  // Set deadline (48 hours for urgent, 5 days normal)
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + (priceChange >= 10 ? 48 : 120));

  // Determine priority
  let priority: 'NORMAL' | 'TRENDING' | 'URGENT' | 'PREMIUM' = 'NORMAL';
  if (priceChange >= 10) priority = 'URGENT';
  else if (priceChange >= 7) priority = 'TRENDING';
  if (market.volume >= 10000000) priority = 'PREMIUM';

  // Create bounty
  await prisma.bounty.create({
    data: {
      headline: `${market.probability}% Chance: ${market.title}`,
      description: `Market moved ${priceChange >= 0 ? '+' : ''}${priceChange}% - analysis needed.`,
      marketId: market.id,
      baseReward,
      bonusPool,
      requirements: JSON.stringify(generateBountyRequirements(market as any)),
      deadline,
      priority,
    },
  });

  console.log(`Created bounty for: ${market.title} ($${baseReward} + $${bonusPool} bonus)`);
}

// Run the sync
syncMarkets();
