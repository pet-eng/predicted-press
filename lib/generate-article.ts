/**
 * AI Article Generation using Claude
 *
 * This generates initial drafts for bounties based on market data.
 * Human editors review and enhance before publishing.
 */

import Anthropic from '@anthropic-ai/sdk';
import { Market } from './polymarket';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface ArticleDraft {
  headline: string;
  subheadline: string;
  excerpt: string;
  content: string; // Markdown
  suggestedCategory: string;
  keyFactors: string[];
  counterarguments: string[];
  readingTime: number; // minutes
}

/**
 * Generate an article draft from market data
 */
export async function generateArticleDraft(
  market: Market,
  priceHistory: { date: string; probability: number }[] = [],
  additionalContext?: string
): Promise<ArticleDraft> {

  const change24h = calculateChange(priceHistory, 1);
  const change7d = calculateChange(priceHistory, 7);

  const prompt = `You are a journalist for Predicted Press, a publication that transforms prediction market data into insightful news analysis. Your style is authoritative yet accessible, similar to The Economist or Bloomberg.

Write an article about this prediction market:

MARKET DATA:
- Question: ${market.title}
- Current Probability: ${market.probability}%
- 24h Change: ${change24h >= 0 ? '+' : ''}${change24h}%
- 7d Change: ${change7d >= 0 ? '+' : ''}${change7d}%
- Trading Volume: $${formatNumber(market.volume)}
- Participants: ~${Math.floor(market.volume / 500).toLocaleString()} traders (estimated)
- Resolution Date: ${market.endDate || 'TBD'}
- Category: ${market.category}
- Source: Polymarket

${additionalContext ? `ADDITIONAL CONTEXT:\n${additionalContext}\n` : ''}

Write a comprehensive analysis article. Your response should be valid JSON with this structure:
{
  "headline": "The headline starting with the probability, e.g., '34% Chance: [Event]'",
  "subheadline": "A compelling one-line summary of what's driving the probability",
  "excerpt": "2-3 sentence summary for article previews",
  "content": "Full article in Markdown format (800-1200 words). Include:\n- Opening paragraph contextualizing the probability\n- Section on factors driving the probability UP\n- Section on counterarguments/risks (factors driving DOWN)\n- Analysis of recent market movements\n- Conclusion with forward-looking perspective\n\nUse ## for section headers. Be specific and cite the market data.",
  "keyFactors": ["Array of 3-5 factors pushing probability up"],
  "counterarguments": ["Array of 3-5 factors that could push probability down"],
  "suggestedCategory": "Politics|Technology|Economics|Markets|Geopolitics|Sports|Culture"
}

Important:
- Lead with data, not speculation
- Explain WHY the market prices it this way
- Acknowledge uncertainty - these are probabilities, not predictions
- Keep tone professional and analytical
- Don't include affiliate links or CTAs - those are added separately`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // Extract JSON from response
  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  // Parse JSON (handle potential markdown code blocks)
  let jsonStr = text;
  if (text.includes('```json')) {
    jsonStr = text.split('```json')[1].split('```')[0];
  } else if (text.includes('```')) {
    jsonStr = text.split('```')[1].split('```')[0];
  }

  const draft = JSON.parse(jsonStr.trim());

  // Calculate reading time (~200 words per minute)
  const wordCount = draft.content.split(/\s+/).length;
  draft.readingTime = Math.ceil(wordCount / 200);

  return draft as ArticleDraft;
}

/**
 * Generate a bounty headline from market data
 */
export async function generateBountyHeadline(market: Market): Promise<string> {
  return `${market.probability}% Chance: ${market.title}`;
}

/**
 * Generate bounty requirements based on market characteristics
 */
export function generateBountyRequirements(market: Market): string[] {
  const requirements: string[] = ['800-1500 words'];

  if (market.volume > 1000000) {
    requirements.push('Include volume/liquidity analysis');
  }

  if (market.category === 'Politics') {
    requirements.push('Reference polling data or precedents');
  } else if (market.category === 'Economics') {
    requirements.push('Include relevant economic indicators');
  } else if (market.category === 'Technology') {
    requirements.push('Technical background explanation');
  }

  requirements.push('Cite at least 2 external sources');
  requirements.push('Include bull and bear cases');

  return requirements;
}

/**
 * Calculate price change over period
 */
function calculateChange(
  history: { date: string; probability: number }[],
  days: number
): number {
  if (history.length < 2) return 0;

  const now = history[history.length - 1].probability;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const pastPoint = history.find(p => new Date(p.date) <= cutoffDate);
  const past = pastPoint?.probability || history[0].probability;

  return Math.round((now - past) * 10) / 10;
}

/**
 * Format large numbers
 */
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toString();
}
