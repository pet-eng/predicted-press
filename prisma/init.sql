-- Predicted Press Database Schema
-- Run this in Neon SQL Editor to initialize the database

-- Drop existing tables if they exist (for fresh start)
DROP TABLE IF EXISTS "AnalyticsEvent" CASCADE;
DROP TABLE IF EXISTS "Subscriber" CASCADE;
DROP TABLE IF EXISTS "Bounty" CASCADE;
DROP TABLE IF EXISTS "Article" CASCADE;
DROP TABLE IF EXISTS "PricePoint" CASCADE;
DROP TABLE IF EXISTS "Author" CASCADE;
DROP TABLE IF EXISTS "Market" CASCADE;

-- Create enums
DROP TYPE IF EXISTS "ArticleStatus" CASCADE;
CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'AI_DRAFT', 'IN_REVIEW', 'REVISION_REQUESTED', 'APPROVED', 'PUBLISHED', 'ARCHIVED');

DROP TYPE IF EXISTS "AuthorTier" CASCADE;
CREATE TYPE "AuthorTier" AS ENUM ('CONTRIBUTOR', 'VERIFIED', 'SENIOR', 'EDITOR', 'ADMIN');

DROP TYPE IF EXISTS "BountyStatus" CASCADE;
CREATE TYPE "BountyStatus" AS ENUM ('OPEN', 'CLAIMED', 'IN_PROGRESS', 'SUBMITTED', 'IN_REVIEW', 'REVISION_REQUESTED', 'APPROVED', 'PAID', 'EXPIRED', 'CANCELLED');

DROP TYPE IF EXISTS "BountyPriority" CASCADE;
CREATE TYPE "BountyPriority" AS ENUM ('NORMAL', 'TRENDING', 'URGENT', 'PREMIUM');

DROP TYPE IF EXISTS "SubscriberTier" CASCADE;
CREATE TYPE "SubscriberTier" AS ENUM ('FREE', 'PRO', 'API');

-- Markets table
CREATE TABLE "Market" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "probability" INTEGER NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "liquidity" DOUBLE PRECISION NOT NULL,
    "endDate" TIMESTAMP(3),
    "category" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'polymarket',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Price history
CREATE TABLE "PricePoint" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "marketId" TEXT NOT NULL,
    "probability" INTEGER NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE
);
CREATE INDEX "PricePoint_marketId_timestamp_idx" ON "PricePoint"("marketId", "timestamp");

-- Authors
CREATE TABLE "Author" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "email" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'Contributor',
    "reputation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "articlesCount" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "tier" "AuthorTier" NOT NULL DEFAULT 'CONTRIBUTOR',
    "specialties" TEXT NOT NULL DEFAULT '[]',
    "paymentMethod" TEXT,
    "paymentDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Articles
CREATE TABLE "Article" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "slug" TEXT NOT NULL UNIQUE,
    "headline" TEXT NOT NULL,
    "subheadline" TEXT,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "marketId" TEXT,
    "authorId" TEXT,
    "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiDraftId" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "affiliateClicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bountyId" TEXT UNIQUE,
    FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE SET NULL,
    FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE SET NULL
);

-- Bounties
CREATE TABLE "Bounty" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "headline" TEXT NOT NULL,
    "description" TEXT,
    "marketId" TEXT NOT NULL,
    "baseReward" DOUBLE PRECISION NOT NULL,
    "bonusPool" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requirements" TEXT NOT NULL DEFAULT '[]',
    "status" "BountyStatus" NOT NULL DEFAULT 'OPEN',
    "deadline" TIMESTAMP(3) NOT NULL,
    "claimedById" TEXT,
    "claimedAt" TIMESTAMP(3),
    "aiDraft" TEXT,
    "aiDraftCreatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "paidOut" BOOLEAN NOT NULL DEFAULT false,
    "paidAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priority" "BountyPriority" NOT NULL DEFAULT 'NORMAL',
    FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE,
    FOREIGN KEY ("claimedById") REFERENCES "Author"("id") ON DELETE SET NULL
);

-- Add foreign key from Article to Bounty
ALTER TABLE "Article" ADD FOREIGN KEY ("bountyId") REFERENCES "Bounty"("id") ON DELETE SET NULL;

-- Subscribers
CREATE TABLE "Subscriber" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "email" TEXT NOT NULL UNIQUE,
    "tier" "SubscriberTier" NOT NULL DEFAULT 'FREE',
    "categories" TEXT NOT NULL DEFAULT '[]',
    "alertThreshold" INTEGER NOT NULL DEFAULT 5,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Analytics
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "type" TEXT NOT NULL,
    "articleId" TEXT,
    "marketId" TEXT,
    "metadata" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AnalyticsEvent_type_timestamp_idx" ON "AnalyticsEvent"("type", "timestamp");
CREATE INDEX "AnalyticsEvent_articleId_idx" ON "AnalyticsEvent"("articleId");

-- Success message
SELECT 'Database schema created successfully!' as status;
