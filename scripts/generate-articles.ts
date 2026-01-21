/**
 * Article Generation Script
 *
 * Generates AI drafts for open bounties that don't have one yet.
 * These drafts serve as starting points for freelance journalists.
 *
 * Usage: npx tsx scripts/generate-articles.ts
 */

import { PrismaClient } from '@prisma/client';
import { generateArticleDraft } from '../lib/generate-article';
import { fetchMarket, fetchPriceHistory } from '../lib/polymarket';

const prisma = new PrismaClient();

async function generateArticles() {
  console.log('Starting article generation...');

  try {
    // Find bounties that need AI drafts
    const bounties = await prisma.bounty.findMany({
      where: {
        status: 'OPEN',
        aiDraft: null,
      },
      include: {
        market: true,
      },
      take: 5, // Process 5 at a time to manage API costs
    });

    console.log(`Found ${bounties.length} bounties needing drafts`);

    for (const bounty of bounties) {
      console.log(`Generating draft for: ${bounty.headline}`);

      try {
        // Get fresh market data
        const market = await fetchMarket(bounty.market.slug);
        if (!market) {
          console.log(`  Could not fetch market data, skipping`);
          continue;
        }

        // Get price history
        const priceHistory = await fetchPriceHistory(bounty.market.id, 30);

        // Generate the draft
        const draft = await generateArticleDraft(market, priceHistory);

        // Save the draft
        await prisma.bounty.update({
          where: { id: bounty.id },
          data: {
            aiDraft: JSON.stringify(draft),
            aiDraftCreatedAt: new Date(),
          },
        });

        console.log(`  ✓ Generated ${draft.readingTime} min read`);

        // Small delay to respect rate limits
        await new Promise(r => setTimeout(r, 1000));

      } catch (error) {
        console.error(`  ✗ Failed to generate draft:`, error);
      }
    }

    console.log('Article generation complete!');

  } catch (error) {
    console.error('Article generation failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Also export a function to generate a single article on demand
export async function generateSingleArticle(bountyId: string) {
  const bounty = await prisma.bounty.findUnique({
    where: { id: bountyId },
    include: { market: true },
  });

  if (!bounty) {
    throw new Error('Bounty not found');
  }

  const market = await fetchMarket(bounty.market.slug);
  if (!market) {
    throw new Error('Could not fetch market data');
  }

  const priceHistory = await fetchPriceHistory(bounty.market.id, 30);
  const draft = await generateArticleDraft(market, priceHistory);

  await prisma.bounty.update({
    where: { id: bountyId },
    data: {
      aiDraft: JSON.stringify(draft),
      aiDraftCreatedAt: new Date(),
    },
  });

  return draft;
}

// Run if called directly
generateArticles();
