import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const status = searchParams.get('status') || 'PUBLISHED';
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    const where: any = {
      status,
    };

    if (category && category !== 'All') {
      where.category = category;
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: {
          author: {
            select: {
              name: true,
              role: true,
              avatarUrl: true,
            },
          },
          market: {
            select: {
              probability: true,
              volume: true,
            },
          },
        },
        orderBy: { publishedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.article.count({ where }),
    ]);

    return NextResponse.json({
      articles,
      total,
      hasMore: offset + articles.length < total,
    });
  } catch (error) {
    console.error('Failed to fetch articles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}

// Create a new article (for CMS)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const article = await prisma.article.create({
      data: {
        slug: body.slug || generateSlug(body.headline),
        headline: body.headline,
        subheadline: body.subheadline,
        excerpt: body.excerpt,
        content: body.content,
        category: body.category,
        marketId: body.marketId,
        authorId: body.authorId,
        status: body.status || 'DRAFT',
        aiGenerated: body.aiGenerated || false,
      },
    });

    return NextResponse.json({ article });
  } catch (error) {
    console.error('Failed to create article:', error);
    return NextResponse.json(
      { error: 'Failed to create article' },
      { status: 500 }
    );
  }
}

function generateSlug(headline: string): string {
  return headline
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}
