/**
 * Generate a sample article using Claude API
 */

import Anthropic from '@anthropic-ai/sdk';
import { Pool } from 'pg';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

interface Market {
  id: string;
  title: string;
  probability: number;
  volume: number;
  category: string;
}

async function generateArticle(market: Market) {
  console.log(`\n📝 Generating article for: "${market.title}"`);
  console.log(`   Probability: ${market.probability}% | Volume: $${market.volume.toLocaleString()}`);

  const prompt = `You are a journalist for Predicted Press, a publication that transforms prediction market data into insightful news analysis.

Write a compelling news article about this prediction market:

**Market Question:** ${market.title}
**Current Probability:** ${market.probability}%
**Trading Volume:** $${market.volume.toLocaleString()}
**Category:** ${market.category}

Your article should:
1. Lead with a probability-first headline (e.g., "87% Chance: Trump Administration to Deport 250,000-500,000")
2. Explain what the probability means in plain English
3. Analyze WHY the market is pricing this outcome at this probability
4. Include potential factors that could shift the probability up or down
5. Provide balanced perspectives and counterarguments
6. Be approximately 600-800 words

Format your response as JSON with this structure:
{
  "headline": "Probability-first headline",
  "subheadline": "Brief context line",
  "excerpt": "2-3 sentence summary for homepage",
  "content": "Full article in markdown format",
  "keyFactors": ["Factor 1", "Factor 2", "Factor 3"],
  "counterarguments": ["Counterpoint 1", "Counterpoint 2"]
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const article = JSON.parse(jsonMatch[0]);
    return article;
  } catch (error) {
    console.error('Error generating article:', error);
    throw error;
  }
}

async function saveArticle(market: Market, article: any) {
  const slug = article.headline
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);

  await pool.query(`
    INSERT INTO "Article" (
      "marketId", slug, headline, subheadline, excerpt, content,
      "keyFactors", counterarguments, status, "probabilityAtPublish", "readTime"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PUBLISHED', $9, $10)
    ON CONFLICT (slug) DO UPDATE SET
      headline = EXCLUDED.headline,
      content = EXCLUDED.content,
      "updatedAt" = NOW()
    RETURNING id
  `, [
    market.id,
    slug,
    article.headline,
    article.subheadline,
    article.excerpt,
    article.content,
    JSON.stringify(article.keyFactors),
    JSON.stringify(article.counterarguments),
    market.probability,
    Math.ceil(article.content.split(' ').length / 200) // ~200 words per minute
  ]);

  console.log(`   ✅ Saved article: "${article.headline}"`);
  return slug;
}

async function main() {
  console.log('🚀 Generating sample articles for Predicted Press\n');

  // Get markets from database
  const result = await pool.query(`
    SELECT id, title, probability, volume, category
    FROM "Market"
    ORDER BY volume DESC
    LIMIT 3
  `);

  const markets = result.rows;
  console.log(`Found ${markets.length} markets to write about`);

  for (const market of markets) {
    try {
      const article = await generateArticle(market);
      await saveArticle(market, article);

      console.log(`\n   📰 Headline: ${article.headline}`);
      console.log(`   📄 Excerpt: ${article.excerpt.substring(0, 100)}...`);
    } catch (error) {
      console.error(`   ❌ Failed to generate article for: ${market.title}`);
    }
  }

  // Summary
  const articleCount = await pool.query('SELECT COUNT(*) FROM "Article"');
  console.log(`\n✅ Total articles in database: ${articleCount.rows[0].count}`);

  await pool.end();
}

main()
  .then(() => {
    console.log('\n🎉 Article generation complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error);
    process.exit(1);
  });
