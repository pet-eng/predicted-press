/**
 * Fetch Trending Markets Script
 *
 * Manually run this script to discover and add new trending markets from Polymarket.
 * Filters out sports markets and requires minimum $50k volume.
 *
 * Usage: npx tsx scripts/fetch-trending-markets.ts
 */

import { PrismaClient } from '@prisma/client';
import { fetchMarkets } from '../lib/polymarket';
import { generateArticleDraft } from '../lib/generate-article';

const prisma = new PrismaClient();

// Configuration
const CONFIG = {
  MIN_VOLUME: 50000, // $50k minimum volume
  EXCLUDED_CATEGORIES: ['Sports'], // Exclude sports markets
  MAX_NEW_MARKETS: 10, // Maximum new markets to add per run
};

// Keywords that indicate sports content (additional filtering)
const SPORTS_KEYWORDS = [
  'nba', 'nfl', 'mlb', 'nhl', 'mls',
  'super bowl', 'world series', 'stanley cup',
  'championship', 'playoffs', 'mvp',
  'quarterback', 'touchdown', 'home run',
  'slam dunk', 'goal scorer', 'batting average',
  'premier league', 'champions league', 'world cup',
  'olympics', 'tennis', 'golf', 'boxing', 'ufc', 'mma',
];

function isSportsMarket(title: string, category: string): boolean {
  if (CONFIG.EXCLUDED_CATEGORIES.includes(category)) {
    return true;
  }
  
  const lowerTitle = title.toLowerCase();
  return SPORTS_KEYWORDS.some(keyword => lowerTitle.includes(keyword));
}

async function fetchTrendingMarkets() {
  console.log('ð Fetching trending markets from Polymarket...\n');
  
  try {
    // Fetch markets sorted by volume
    const allMarkets = await fetchMarkets(200);
    console.log(`ð Fetched ${allMarkets.length} markets from Polymarket`);
    
    // Filter markets
    const eligibleMarkets = allMarkets.filter(market => {
      // Must meet volume threshold
      if (market.volume < CONFIG.MIN_VOLUME) return false;
      
      // Exclude sports
      if (isSportsMarket(market.title, market.category)) return false;
      
      return true;
    });
    
    console.log(`â ${eligibleMarkets.length} markets pass filters (non-sports, >$${CONFIG.MIN_VOLUME.toLocaleString()} volume)\n`);
    
    // Check which ones we already have
    const existingIds = await prisma.market.findMany({
      select: { id: true },
    });
    const existingIdSet = new Set(existingIds.map(m => m.id));
    
    const newMarkets = eligibleMarkets.filter(m => !existingIdSet.has(m.id));
    console.log(`ð ${newMarkets.length} are new markets not in our database\n`);
    
    if (newMarkets.length === 0) {
      console.log('No new markets to add. All trending markets are already tracked.');
      return;
    }
    
    // Take top N new markets by volume
    const marketsToAdd = newMarkets
      .sort((a, b) => b.volume - a.volume)
      .slice(0, CONFIG.MAX_NEW_MARKETS);
    
    console.log(`ð Adding ${marketsToAdd.length} new markets:\n`);
    
    for (const market of marketsToAdd) {
      console.log(`\nââââââââââââââââââââââââââââââââââââââââ`);
      console.log(`ð ${market.title}`);
      console.log(`   Probability: ${market.probability}%`);
      console.log(`   Volume: $${market.volume.toLocaleString()}`);
      console.log(`   Category: ${market.category}`);
      
      // Add to database
      await prisma.market.create({
        data: {
          id: market.id,
          title: market.title,
          slug: market.slug,
          probability: market.probability,
          volume: market.volume,
          liquidity: market.liquidity,
          endDate: market.endDate ? new Date(market.endDate) : null,
          category: market.category,
          source: market.source,
          lastArticleProbability: market.probability,
          lastArticleGeneratedAt: new Date(),
        },
      });
      
      console.log(`   â Added to database`);
      
      // Generate initial article
      console.log(`   ðï¸  Generating article...`);
      try {
        const draft = await generateArticleDraft(market, []);
        
        // Create article in database
        const article = await prisma.article.create({
          data: {
            slug: market.slug,
            headline: draft.headline,
            subheadline: draft.subheadline,
            excerpt: draft.excerpt,
            content: draft.content,
            category: draft.suggestedCategory,
            marketId: market.id,
            status: 'PUBLISHED',
            publishedAt: new Date(),
            aiGenerated: true,
            probabilityAtGeneration: market.probability,
            version: 1,
            isLatest: true,
          },
        });
        
        // Update market with article generation info
        await prisma.market.update({
          where: { id: market.id },
          data: {
            lastArticleProbability: market.probability,
            lastArticleGeneratedAt: new Date(),
          },
        });
        
        console.log(`   â Article created: "${draft.headline}"`);
      } catch (articleError) {
        console.error(`   â Failed to generate article:`, articleError);
      }
    }
    
    console.log(`\nââââââââââââââââââââââââââââââââââââââââ`);
    console.log(`\nð Done! Added ${marketsToAdd.length} new markets with articles.`);
    
  } catch (error) {
    console.error('â Failed to fetch trending markets:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fetchTrendingMarkets();
