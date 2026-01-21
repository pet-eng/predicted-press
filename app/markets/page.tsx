import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

interface Market {
  id: string;
  title: string;
  slug: string;
  probability: number;
  volume: number;
  liquidity: number;
  endDate: string | null;
  category: string;
}

async function getMarkets(): Promise<Market[]> {
  try {
    const result = await pool.query(`
      SELECT * FROM "Market"
      ORDER BY volume DESC
    `);
    return result.rows;
  } catch (error) {
    console.error('Error fetching markets:', error);
    return [];
  }
}

export default async function MarketsPage() {
  const markets = await getMarkets();

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <a href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-stone-900 flex items-center justify-center">
              <div className="w-0.5 h-5 bg-white"></div>
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold tracking-tight">PREDICTED</h1>
              <p className="text-xs text-stone-500 tracking-widest uppercase">Probability Led Press</p>
            </div>
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-serif font-bold mb-8">All Markets</h1>

        <div className="grid gap-4">
          {markets.map((market) => (
            <div key={market.id} className="bg-white border border-stone-200 rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <span className="inline-block bg-stone-100 text-stone-700 px-2 py-1 text-xs font-medium rounded mb-2">
                    {market.category}
                  </span>
                  <h2 className="text-xl font-semibold mb-2">{market.title}</h2>
                  <div className="flex gap-4 text-sm text-stone-500">
                    <span>Volume: ${Math.round(market.volume).toLocaleString()}</span>
                    <span>Liquidity: ${Math.round(market.liquidity).toLocaleString()}</span>
                    {market.endDate && (
                      <span>Ends: {new Date(market.endDate).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-amber-600">{Math.round(market.probability)}%</div>
                  <div className="text-sm text-stone-500">probability</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-stone-200 rounded-full h-2">
                  <div
                    className="bg-amber-500 h-2 rounded-full"
                    style={{ width: `${market.probability}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-stone-200">
          <a href="/" className="text-amber-700 font-medium hover:underline">
            â Back to home
          </a>
        </div>
      </main>
    </div>
  );
}
