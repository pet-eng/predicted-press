-- Seed data for Predicted Press
-- Live market data from Polymarket (January 21, 2026)

-- Insert Markets
INSERT INTO "Market" (id, title, slug, probability, volume, liquidity, "endDate", category, source) VALUES
('517310', 'Will Trump deport less than 250,000?', 'will-trump-deport-less-than-250000', 2, 968442, 7433, '2025-12-31T12:00:00Z', 'Politics', 'polymarket'),
('517311', 'Will Trump deport 250,000-500,000 people?', 'will-trump-deport-250000-500000-people', 87, 1052903, 7067, '2025-12-31T12:00:00Z', 'Politics', 'polymarket'),
('517313', 'Will Trump deport 500,000-750,000 people?', 'will-trump-deport-500000-750000-people', 5, 446436, 3868, '2025-12-31T12:00:00Z', 'Politics', 'polymarket'),
('517314', 'Will Trump deport 750,000-1,000,000 people?', 'will-trump-deport-750000-1000000-people', 2, 390984, 8915, '2025-12-31T12:00:00Z', 'Politics', 'polymarket'),
('517315', 'Will Trump deport 1,000,000-1,250,000 people?', 'will-trump-deport-1000000-1250000-people', 2, 405439, 7885, '2025-12-31T12:00:00Z', 'Politics', 'polymarket'),
('517316', 'Will Trump deport 1,250,000-1,500,000 people?', 'will-trump-deport-1250000-1500000-people', 1, 319853, 8218, '2025-12-31T12:00:00Z', 'Politics', 'polymarket'),
('517317', 'Will Trump deport 1,500,000-1,750,000 people?', 'will-trump-deport-1500000-1750000-people', 0, 297792, 11069, '2025-12-31T12:00:00Z', 'Politics', 'polymarket'),
('517318', 'Will Trump deport 1,750,000-2,000,000 people?', 'will-trump-deport-1750000-2000000-people', 0, 255254, 8970, '2025-12-31T12:00:00Z', 'Politics', 'polymarket'),
('517319', 'Will Trump deport 2,000,000 or more people?', 'will-trump-deport-2000000-or-more-people', 1, 312271, 10981, '2025-12-31T12:00:00Z', 'Politics', 'polymarket'),
('517321', 'Will Trump deport 750,000 or more people in 2025?', 'will-trump-deport-750000-or-more-people-in-2025', 3, 410298, 2190, '2025-12-31T12:00:00Z', 'Politics', 'polymarket'),
('521944', 'Will Elon and DOGE cut less than $50b in federal spending in 2025?', 'will-elon-and-doge-cut-less-than-50b-in-federal-spending-in-2025', 98, 321303, 4563, '2025-12-31T12:00:00Z', 'Finance', 'polymarket'),
('521945', 'Will Elon and DOGE cut between $50-100b in federal spending in 2025?', 'will-elon-and-doge-cut-between-50-100b-in-federal-spending-in-2025', 1, 354402, 5294, '2025-12-31T12:00:00Z', 'Finance', 'polymarket'),
('521946', 'Will Elon and DOGE cut between $100-150b in federal spending in 2025?', 'will-elon-and-doge-cut-between-100-150b-in-federal-spending-in-2025', 0, 265832, 6891, '2025-12-31T12:00:00Z', 'Finance', 'polymarket'),
('521947', 'Will Elon and DOGE cut between $150-200b in federal spending in 2025?', 'will-elon-and-doge-cut-between-150-200b-in-federal-spending-in-2025', 0, 232478, 9815, '2025-12-31T12:00:00Z', 'Finance', 'polymarket'),
('521963', 'Will Elon cut the budget by at least 10% in 2025?', 'will-elon-cut-the-budget-by-at-least-10-in-2025', 0, 129007, 9517, '2026-02-28T12:00:00Z', 'Finance', 'polymarket'),
('521964', 'Will Elon cut the budget by at least 5% in 2025?', 'will-elon-cut-the-budget-by-at-least-5-in-2025', 1, 158657, 5319, '2026-02-28T12:00:00Z', 'Finance', 'polymarket'),
('526939', 'Brazil unemployment below 6.3% for Q4 2025?', 'brazil-unemployment-below-6pt3-for-q4-2025', 100, 218016, 737, '2025-12-31T12:00:00Z', 'Finance', 'polymarket'),
('527079', 'Will GTA 6 cost $100+?', 'will-gta-6-cost-100', 1, 1630924, 55814, '2026-02-28T12:00:00Z', 'Technology', 'polymarket')
ON CONFLICT (id) DO UPDATE SET probability = EXCLUDED.probability, volume = EXCLUDED.volume, liquidity = EXCLUDED.liquidity, "updatedAt" = NOW();

-- Insert price points for historical tracking
INSERT INTO "PricePoint" ("marketId", probability, volume, timestamp) VALUES
('517310', 2, 968442, NOW()),
('517311', 87, 1052903, NOW()),
('517313', 5, 446436, NOW()),
('517314', 2, 390984, NOW()),
('517315', 2, 405439, NOW()),
('517316', 1, 319853, NOW()),
('517317', 0, 297792, NOW()),
('517318', 0, 255254, NOW()),
('517319', 1, 312271, NOW()),
('517321', 3, 410298, NOW()),
('521944', 98, 321303, NOW()),
('521945', 1, 354402, NOW()),
('521946', 0, 265832, NOW()),
('521947', 0, 232478, NOW()),
('521963', 0, 129007, NOW()),
('521964', 1, 158657, NOW()),
('526939', 100, 218016, NOW()),
('527079', 1, 1630924, NOW());

-- Create bounties for high-interest markets
INSERT INTO "Bounty" (headline, description, "marketId", "baseReward", "bonusPool", requirements, status, deadline, priority) VALUES
('Analysis: Trump Deportation Numbers - What Does 87% Probability Mean?',
 'Write a comprehensive analysis exploring why the market is pricing 250,000-500,000 deportations at 87%. Include expert perspectives on ICE capacity, historical deportation rates, and policy implementation challenges.',
 '517311', 150, 50, '["Minimum 1000 words", "At least 3 expert sources", "Include historical context", "Cite prediction market data"]', 'OPEN', NOW() + INTERVAL '3 days', 'TRENDING'),

('Analysis: GTA 6 Pricing - Will Rockstar Break the $100 Barrier?',
 'Explore the economics behind video game pricing and why the market gives only 1% chance to GTA 6 costing $100+. Analyze Take-Two''s pricing history, consumer sentiment, and industry trends.',
 '527079', 125, 25, '["Minimum 800 words", "Industry expert quotes", "Compare to historical game launches", "Include consumer survey data"]', 'OPEN', NOW() + INTERVAL '5 days', 'NORMAL'),

('Analysis: DOGE Budget Cuts - Why Markets Are Skeptical',
 'Deep dive into why prediction markets give 98% probability that Elon Musk''s DOGE initiative will cut less than $50 billion in federal spending. Examine government spending mechanics, political obstacles, and historical precedents.',
 '521944', 175, 75, '["Minimum 1200 words", "Budget expert interviews", "Government spending breakdown", "Political analysis"]', 'OPEN', NOW() + INTERVAL '4 days', 'TRENDING');

-- Create a sample author for testing
INSERT INTO "Author" (email, name, bio, role, tier, specialties) VALUES
('demo@predictedpress.com', 'Demo Writer', 'Sample author account for testing the bounty system.', 'Contributor', 'CONTRIBUTOR', '["Politics", "Technology"]')
ON CONFLICT (email) DO NOTHING;

-- Create a sample subscriber
INSERT INTO "Subscriber" (email, tier, categories, "alertThreshold") VALUES
('demo@subscriber.com', 'FREE', '["Politics", "Finance", "Technology"]', 5)
ON CONFLICT (email) DO NOTHING;

SELECT 'Seed data inserted successfully!' as status;
