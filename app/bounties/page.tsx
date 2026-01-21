import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

interface Bounty {
  id: string;
  title: string;
  description: string;
  reward: number;
  status: string;
  marketId: string | null;
  market_title: string | null;
  probability: number | null;
  category: string | null;
}

async function getBounties(): Promise<Bounty[]> {
  try {
    const result = await pool.query(`
      SELECT b.*, m.title as market_title, m.probability, m.category
      FROM "Bounty" b
      LEFT JOIN "Market" m ON b."marketId" = m.id
      ORDER BY b.reward DESC
    `);
    return result.rows;
  } catch (error) {
    console.error('Error fetching bounties:', error);
    return [];
  }
}

export default async function BountiesPage() {
  const bounties = await getBounties();

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
        <h1 className="text-4xl font-serif font-bold mb-4">Writing Bounties</h1>
        <p className="text-stone-600 mb-8">Earn rewards by writing analysis on prediction markets</p>

        {bounties.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-lg p-8 text-center">
            <p className="text-stone-500">No bounties available at the moment. Check back soon!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {bounties.map((bounty) => (
              <div key={bounty.id} className="bg-white border border-stone-200 rounded-lg p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <span className="inline-block bg-stone-100 text-stone-700 px-2 py-1 text-xs font-medium rounded mb-2">
                      {bounty.category || 'General'}
                    </span>
                    <h2 className="text-xl font-semibold mb-2">{bounty.title}</h2>
                    <p className="text-stone-600 mb-3">{bounty.description}</p>
                    {bounty.market_title && (
                      <p className="text-sm text-stone-500">
                        Related market: {bounty.market_title} ({Math.round(bounty.probability || 0)}% probability)
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-2xl font-bold text-green-600">${bounty.reward}</div>
                    <div className="text-sm text-stone-500">reward</div>
                    <span className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded ${
                      bounty.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-stone-100 text-stone-600'
                    }`}>
                      {bounty.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 pt-8 border-t border-stone-200">
          <a href="/" className="text-amber-700 font-medium hover:underline">
            â Back to home
          </a>
        </div>
      </main>
    </div>
  );
}
