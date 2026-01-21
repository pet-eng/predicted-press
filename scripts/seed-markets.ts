/**
 * Seed Markets Script
 * Fetches live data from Polymarket and populates the database
 * Run with: npx ts-node scripts/seed-markets.ts
 */

import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || '';

interface PolymarketMarket {
  id: string;
  question: string;
  slug: string;
  outcomePrices: string;
  volume: number;
  liquidity: number;
  endDate: string;
  active: boolean;
}

// Categories based on keywords
function categorizeMarket(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes('trump') || lower.includes('biden') || lower.includes('election') ||
      lower.includes('president') || lower.includes('congress') || lower.includes('senate') ||
      lower.includes('republican') || lower.includes('democrat') || lower.includes('vote')) {
    return 'Politics';
  }
  if (lower.includes('bitcoin') || lower.includes('crypto') || lower.includes('ethereum') ||
      lower.includes('stock') || lower.includes('market') || lower.includes('fed') ||
      lower.includes('inflation') || lower.includes('economy') || lower.includes('gdp')) {
    return 'Finance';
  }
  if (lower.includes('ai') || lower.includes('openai') || lower.includes('google') ||
      lower.includes('apple') || lower.includes('microsoft') || lower.includes('tech') ||
      lower.includes('spacex') || lower.includes('tesla')) {
    return 'Technology';
  }
  if (lower.includes('war') || lower.includes('ukraine') || lower.includes('russia') ||
      lower.includes('china') || lower.includes('nato') || lower.includes('military')) {
    return 'Geopolitics';
  }
  if (lower.includes('super bowl') || lower.includes('nfl') || lower.includes('nba') ||
      lower.includes('world cup') || lower.includes('olympics') || lower.includes('championship')) {
    return 'Sports';
  }
  return 'Other';
}

async function fetchPolymarketData(): Promise<PolymarketMarket[]> {
  console.log('📡 Fetching data from Polymarket...');

  try {
    const response = await fetch('https://gamma-api.polymarket.com/markets?limit=50&active=true&closed=false');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const markets = await response.json();
    console.log(`✅ Fetched ${markets.length} markets from Polymarket`);
    return markets;
  } catch (error) {
    console.error('❌ Error fetching from Polymarket:', error);
    throw error;
  }
}

async function seedDatabase() {
  console.log('🌱 Starting database seed...\n');

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Fetch live data
    const markets = await fetchPolymarketData();

    // Insert markets
    console.log('\n📊 Inserting markets into database...');

    let inserted = 0;
    for (const market of markets) {
      try {
        // Parse probability from outcomePrices (format: "[0.65, 0.35]" for Yes/No)
        let probability = 50;
        if (market.outcomePrices) {
          try {
            const prices = JSON.parse(market.outcomePrices);
            probability = Math.round(prices[0] * 100);
          } catch (e) {
            // Default to 50 if parsing fails
          }
        }

        const category = categorizeMarket(market.question);

        await pool.query(`
          INSERT INTO "Market" (id, title, slug, probability, volume, liquidity, "endDate", category, source, "createdAt", "updatedAt", "lastSyncedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET
            probability = EXCLUDED.probability,
            volume = EXCLUDED.volume,
            liquidity = EXCLUDED.liquidity,
            "updatedAt" = NOW(),
            "lastSyncedAt" = NOW()
        `, [
          market.id,
          market.question,
          market.slug || market.id,
          probability,
          market.volume || 0,
          market.liquidity || 0,
          market.endDate ? new Date(market.endDate) : null,
          category
        ]);

        // Also insert a price point for historical tracking
        await pool.query(`
          INSERT INTO "PricePoint" ("marketId", probability, volume, timestamp)
          VALUES ($1, $2, $3, NOW())
        `, [market.id, probability, market.volume || 0]);

        inserted++;
        console.log(`  ✓ ${market.question.substring(0, 60)}... (${probability}%)`);
      } catch (error: any) {
        console.error(`  ✗ Failed to insert: ${market.question.substring(0, 40)}...`, error.message);
      }
    }

    console.log(`\n✅ Successfully inserted ${inserted} markets`);

    // Create some sample bounties for trending markets
    console.log('\n💰 Creating sample bounties for high-volume markets...');

    const topMarkets = await pool.query(`
      SELECT id, title, probability, volume
      FROM "Market"
      ORDER BY volume DESC
      LIMIT 10
    `);

    for (const market of topMarkets.rows) {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 3); // 3 days from now

      const baseReward = market.volume > 1000000 ? 150 : market.volume > 500000 ? 100 : 75;

      await pool.query(`
        INSERT INTO "Bounty" (headline, description, "marketId", "baseReward", "bonusPool", requirements, status, deadline, priority, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, 'OPEN', $7, $8, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [
        `Analysis: ${market.title.substring(0, 80)}`,
        `Write a comprehensive analysis exploring why this market is currently at ${market.probability}%. Include expert perspectives, historical context, and potential catalysts that could shift the probability.`,
        market.id,
        baseReward,
        market.volume > 1000000 ? 50 : 25,
        JSON.stringify(['Minimum 800 words', 'At least 2 expert sources', 'Include counterarguments', 'Cite prediction market data']),
        deadline,
        market.volume > 1000000 ? 'TRENDING' : 'NORMAL'
      ]);
    }

    console.log(`✅ Created bounties for top 10 markets`);

    // Summary
    const marketCount = await pool.query('SELECT COUNT(*) FROM "Market"');
    const bountyCount = await pool.query('SELECT COUNT(*) FROM "Bounty"');
    const pricePointCount = await pool.query('SELECT COUNT(*) FROM "PricePoint"');

    console.log('\n📈 Database Summary:');
    console.log(`   Markets: ${marketCount.rows[0].count}`);
    console.log(`   Bounties: ${bountyCount.rows[0].count}`);
    console.log(`   Price Points: ${pricePointCount.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
seedDatabase()
  .then(() => {
    console.log('\n🎉 Seed completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seed failed:', error);
    process.exit(1);
  });
