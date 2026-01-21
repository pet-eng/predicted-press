import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'OPEN';
  const category = searchParams.get('category');
  const sort = searchParams.get('sort') || 'reward';
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    const where: any = {};

    if (status !== 'all') {
      where.status = status;
    }

    if (category && category !== 'All') {
      where.market = { category };
    }

    let orderBy: any = { baseReward: 'desc' };
    if (sort === 'deadline') orderBy = { deadline: 'asc' };
    if (sort === 'recent') orderBy = { createdAt: 'desc' };

    const bounties = await prisma.bounty.findMany({
      where,
      include: {
        market: {
          select: {
            title: true,
            probability: true,
            category: true,
            volume: true,
          },
        },
        claimedBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy,
      take: limit,
    });

    // Parse requirements JSON
    const transformed = bounties.map((b: any) => ({
      ...b,
      requirements: JSON.parse(b.requirements),
      aiDraft: b.aiDraft ? JSON.parse(b.aiDraft) : null,
    }));

    return NextResponse.json({ bounties: transformed });
  } catch (error) {
    console.error('Failed to fetch bounties:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bounties' },
      { status: 500 }
    );
  }
}

// Claim a bounty
export async function POST(request: Request) {
  try {
    const { bountyId, authorId } = await request.json();

    // Check if bounty is still open
    const bounty = await prisma.bounty.findUnique({
      where: { id: bountyId },
    });

    if (!bounty) {
      return NextResponse.json(
        { error: 'Bounty not found' },
        { status: 404 }
      );
    }

    if (bounty.status !== 'OPEN') {
      return NextResponse.json(
        { error: 'Bounty is no longer available' },
        { status: 400 }
      );
    }

    // Claim it
    const updated = await prisma.bounty.update({
      where: { id: bountyId },
      data: {
        status: 'CLAIMED',
        claimedById: authorId,
        claimedAt: new Date(),
      },
    });

    return NextResponse.json({ bounty: updated });
  } catch (error) {
    console.error('Failed to claim bounty:', error);
    return NextResponse.json(
      { error: 'Failed to claim bounty' },
      { status: 500 }
    );
  }
}
