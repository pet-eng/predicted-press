import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function getArticles() {
  try {
    const result = await pool.query(`
      SELECT a.*, m.probability, m.volume, m.category as market_category
      FROM "Article" a
      LEFT JOIN "Market" m ON a."marketId" = m.id
      WHERE a.status = 'PUBLISHED'
      ORDER BY a."createdAt" DESC
      LIMIT 10
    `);
    return result.rows;
  } catch (error) {
    console.error('Error fetching articles:', error);
    return [];
  }
}

async function getMarkets() {
  try {
    const result = await pool.query(`
      SELECT * FROM "Market"
      ORDER BY volume DESC
      LIMIT 6
    `);
    return result.rows;
  } catch (error) {
    console.error('Error fetching markets:', error);
    return [];
  }
}

async function getBounties() {
  try {
    const result = await pool.query(`
      SELECT * FROM "Bounty"
      WHERE status = 'OPEN'
      ORDER BY "baseReward" DESC
      LIMIT 3
    `);
    return result.rows;
  } catch (error) {
    console.error('Error fetching bounties:', error);
    return [];
  }
}

export default async function HomePage() {
  const [articles, markets, bounties] = await Promise.all([
    getArticles(),
    getMarkets(),
    getBounties()
  ]);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-stone-900 flex items-center justify-center">
                <div className="w-0.5 h-5 bg-white"></div>
              </div>
              <div>
                <h1 className="text-2xl font-serif font-bold tracking-tight">PREDICTED</h1>
                <p className="text-xs text-stone-500 tracking-widest uppercase">Probability Led Press</p>
              </div>
            </div>
            <nav className="flex gap-6 text-sm">
              <a href="#" className="text-stone-600 hover:text-stone-900">Markets</a>
              <a href="#" className="text-stone-600 hover:text-stone-900">Bounties</a>
              <a href="#" className="text-stone-600 hover:text-stone-900">About</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-white border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <p className="text-stone-500 mb-2 uppercase tracking-wider text-sm">Featured Analysis</p>
          {articles[0] && (
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <span className="inline-block bg-amber-100 text-amber-800 px-2 py-1 text-xs font-medium rounded mb-3">
                  {articles[0].probability}% Probability
                </span>
                <h2 className="text-3xl font-serif font-bold mb-4 leading-tight">
                  {articles[0].headline}
                </h2>
                <p className="text-stone-600 mb-4">{articles[0].excerpt}</p>
                <a href={`/article/${articles[0].slug}`} className="text-amber-700 font-medium hover:underline">
                  Read full analysis →
                </a>
              </div>
              <div className="bg-stone-100 rounded-lg p-6">
                <h3 className="font-medium mb-4">Market Data</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-stone-600">Current Probability</span>
                    <span className="font-bold text-2xl">{articles[0].probability}%</span>
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-3">
                    <div
                      className="bg-amber-500 h-3 rounded-full"
                      style={{ width: `${articles[0].probability}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Volume</span>
                    <span>${Math.round(articles[0].volume || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Latest Articles */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-xl font-serif font-bold mb-6">Latest Analysis</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {articles.slice(1).map((article) => (
            <article key={article.id} className="bg-white rounded-lg border border-stone-200 p-6 hover:shadow-md transition-shadow">
              <span className="inline-block bg-stone-100 text-stone-700 px-2 py-1 text-xs font-medium rounded mb-3">
                {article.category}
              </span>
              <h3 className="font-serif font-bold mb-2 leading-snug">{article.headline}</h3>
              <p className="text-sm text-stone-600 mb-4 line-clamp-2">{article.excerpt}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-amber-700">{article.probability}%</span>
                <a href={`/article/${article.slug}`} className="text-stone-500 hover:text-stone-900">Read →</a>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Live Markets */}
      <section className="bg-white border-y border-stone-200">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-xl font-serif font-bold mb-6">Live Markets</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {markets.map((market) => (
              <div key={market.id} className="border border-stone-200 rounded-lg p-4 hover:border-stone-300 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-sm flex-1 pr-4">{market.title}</h3>
                  <span className="text-xl font-bold text-amber-700">{market.probability}%</span>
                </div>
                <div className="flex gap-4 text-xs text-stone-500">
                  <span>Vol: ${Math.round(market.volume).toLocaleString()}</span>
                  <span className="px-2 py-0.5 bg-stone-100 rounded">{market.category}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bounty Board */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-serif font-bold">Open Bounties</h2>
          <a href="/bounties" className="text-amber-700 text-sm font-medium hover:underline">View all →</a>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {bounties.map((bounty) => (
            <div key={bounty.id} className="bg-gradient-to-br from-amber-50 to-stone-50 border border-amber-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  bounty.priority === 'TRENDING' ? 'bg-amber-200 text-amber-800' : 'bg-stone-200 text-stone-700'
                }`}>
                  {bounty.priority}
                </span>
                <span className="font-bold text-lg text-green-700">${bounty.baseReward}</span>
              </div>
              <h3 className="font-serif font-bold mb-2">{bounty.headline}</h3>
              <p className="text-sm text-stone-600 mb-4 line-clamp-2">{bounty.description}</p>
              <button className="w-full bg-stone-900 text-white py-2 rounded font-medium hover:bg-stone-800 transition-colors">
                Claim Bounty
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-white flex items-center justify-center">
              <div className="w-0.5 h-5 bg-stone-900"></div>
            </div>
            <div>
              <h3 className="text-xl font-serif font-bold">PREDICTED</h3>
              <p className="text-xs text-stone-400 tracking-widest uppercase">Probability Led Press</p>
            </div>
          </div>
          <p className="text-stone-400 text-sm">
            News analysis backed by prediction markets. Data from Polymarket and other sources.
          </p>
          <p className="text-stone-500 text-xs mt-4">
            © 2026 Predicted Press. Not financial advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
