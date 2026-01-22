/**
 * AI Article Generation using Claude
 *
 * This generates journalist-quality articles based on prediction market data.
 * Articles are written in an accessible but analytical style, similar to Vox or FiveThirtyEight.
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
 * Generate a journalist-quality article from market data
 */
export async function generateArticleDraft(
  market: Market,
  priceHistory: { date: string; probability: number }[] = [],
  additionalContext?: string
): Promise<ArticleDraft> {
  const change24h = calculateChange(priceHistory, 1);
  const change7d = calculateChange(priceHistory, 7);
  const change30d = calculateChange(priceHistory, 30);

  const prompt = `You are a senior journalist for Predicted Press, writing in the style of FiveThirtyEight, Vox, or The Atlantic. Your writing is:
- Accessible but analytical - you explain complex topics without dumbing them down
- Story-driven - you find the human angle, the "why it matters" narrative
- Data-informed but not data-obsessed - numbers support the story, they don't replace it
- Contextual - you connect current events to historical precedents and broader trends

Write a feature article about this prediction market:

MARKET DATA:
- Question: ${market.title}
- Current Probability: ${market.probability}%
- 24-hour change: ${change24h >= 0 ? '+' : ''}${change24h}%
- 7-day change: ${change7d >= 0 ? '+' : ''}${change7d}%
- 30-day change: ${change30d >= 0 ? '+' : ''}${change30d}%
- Trading Volume: $${formatNumber(market.volume)}
- Active Traders: ~${Math.floor(market.volume / 500).toLocaleString()} (estimated)
- Resolution Date: ${market.endDate || 'TBD'}
- Category: ${market.category}

${additionalContext ? `ADDITIONAL CONTEXT:\n${additionalContext}\n` : ''}

WRITING GUIDELINES:
1. LEAD WITH A HOOK - Start with a compelling scene, anecdote, or surprising fact. Don't start with "Prediction markets show..." or statistics. Make me want to read more.

2. EXPLAIN THE STAKES - Why should readers care? What are the real-world implications? Who wins, who loses?

3. FOLLOW THE MONEY - Why are sophisticated traders betting this way? What do they know that casual observers might miss?

4. PRESENT MULTIPLE PERSPECTIVES - Interview-style quotes from hypothetical analysts on different sides. "Bulls point to..." and "Bears argue..."

5. HISTORICAL CONTEXT - Has something like this happened before? What can we learn from similar situations?

6. THE CONTRARIAN VIEW - What's the strongest argument against the current market consensus? Why might the 'smart money' be wrong?

7. PRACTICAL IMPLICATIONS - What should readers watch for? What events could shift the probability dramatically?

8. END WITH FORWARD LOOK - Don't just summarize. Leave readers with something to think about.

FORMATTING REQUIREMENTS:
- 1200-1800 words
- Use ## for section headers (but don't overdo it - 3-4 sections max)
- Write in a conversational but authoritative tone
- Include specific details and examples
- Use short paragraphs for readability
- Bold key insights sparingly

Your response should be valid JSON:
{
  "headline": "A punchy, intriguing headline (NOT starting with probability - save that for the subheadline)",
  "subheadline": "Include the probability here: '${market.probability}% chance...' plus one key insight",
  "excerpt": "2-3 sentence hook that makes readers click",
  "content": "Full article in Markdown. Remember: accessible but analytical, story-driven, thoroughly researched.",
  "keyFactors": ["3-5 concrete factors pushing probability up"],
  "counterarguments": ["3-5 concrete factors that could push probability down"],
  "suggestedCategory": "Politics|Technology|Economics|Markets|Geopolitics|Culture"
}

IMPORTANT: Write like a human journalist, not an AI assistant. No "Let's dive in" or "In conclusion". Be specific, be vivid, be interesting.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 6000,
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
  const requirements: string[] = ['1200-1800 words'];

  if (market.volume > 1000000) {
    requirements.push('Include volume/liquidity analysis');
  }

  if (market.category === 'Politics') {
    requirements.push('Reference polling data or historical precedents');
  } else if (market.category === 'Economics') {
    requirements.push('Include relevant economic indicators');
  } else if (market.category === 'Technology') {
    requirements.push('Technical background explanation');
  } else if (market.category === 'Geopolitics') {
    requirements.push('International relations context');
  }

  requirements.push('Cite at least 3 external sources or precedents');
  requirements.push('Include bull and bear cases with specific arguments');
  requirements.push('Explain real-world implications for ordinary people');

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
