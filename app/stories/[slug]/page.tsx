import { Pool } from 'pg';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

interface Article {
  id: string;
  slug: string;
  headline: string;
  subheadline: string;
  content: string;
  category: string;
  probability: number;
  volume: number;
  market_category: string;
  market_title: string;
}

async function getArticle(slug: string): Promise<Article | null> {
  try {
    const result = await pool.query(`
      SELECT a.*, m.probability, m.volume, m.category as market_category, m.title as market_title
      FROM "Article" a
      LEFT JOIN "Market" m ON a."marketId" = m.id
      WHERE a.slug = $1
    `, [slug]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching article:', error);
    return null;
  }
}

export default async function StoryPage({ params }: { params: { slug: string } }) {
  const article = await getArticle(params.slug);

  if (!article) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <a href="/" className="flex items-center gap-3">
            <div className="w8 h-8 bg-stone-900 flex items-center justify-center">
              <div className="w-0.5 h-5 bg-white"></div>
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold tracking-tight">PREDICTED</h1>
              <p className="text-xs text-stone-500 tracking-widest uppercase">Probability Led Press</p>
            </div>
          </a>
        </div>
      </header>

      <article className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <span className="inline-block bg-stone-100 text-stone-700 px-2 py-1 text-xs font-medium rounded mb-3">
            {article.category}
          </span>
          <span className="inline-block bg-amber-100 text-amber-800 px-2 py-1 text-xs font-medium rounded mb-3 ml-2">
            {article.probability}% Probability
          </span>
        </div>

        <h1 className="text-4xl font-serif font-bold mb-4 leading-tight">
          {article.headline}
        </h1>

        <p className="text-xl text-stone-600 mb-8">{article.subheadline}</p>

        <div className="bg-stone-100 rounded-lg p-6 mb-8">
          <h3 className="font-medium mb-4">Market Data</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-stone-500 text-sm">Current Probability</span>
              <p className="text-2xl font-bold">{article.probability}%</p>
            </div>
            <div>
              <span className="text-stone-500 text-sm">Volume</span>
              <p className="text-2xl font-bold">${Math.round(article.volume || 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="w-full bg-stone-200 rounded-full h-3 mt-4">
            <div
              className="bg-amber-500 h-3 rounded-full"
              style={{ width: `${article.probability}%` }}
            ></div>
          </div>
        </div>

        <div className="prose prose-stone max-w-none">
          {article.content.split('\n').map((paragraph: string, i: number) => (
            <p key={i} className="mb-4 text-stone-700 leading-relaxed">{paragraph}</p>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-stone-200">
          <a href="/" className="text-amber-700 font-medium hover:underline">
            ← Back to home
          </a>
        </div>
      </article>
    </div>
  );
}
