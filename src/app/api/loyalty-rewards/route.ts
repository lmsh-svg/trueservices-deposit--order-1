import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { loyaltyRewards } from '@/db/schema';
import { eq, desc, asc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single loyalty reward fetch
    if (id) {
      if (isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const reward = await db
        .select()
        .from(loyaltyRewards)
        .where(eq(loyaltyRewards.id, parseInt(id)))
        .limit(1);

      if (reward.length === 0) {
        return NextResponse.json(
          { error: 'Loyalty reward not found', code: 'REWARD_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(reward[0], { status: 200 });
    }

    // List with pagination, filtering, and sorting
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const userId = searchParams.get('userId');
    const orderId = searchParams.get('orderId');
    const sortField = searchParams.get('sort') || 'createdAt';
    const sortOrder = searchParams.get('order') || 'desc';

    let query = db.select().from(loyaltyRewards);

    // Build filter conditions
    const conditions = [];
    if (userId) {
      if (isNaN(parseInt(userId))) {
        return NextResponse.json(
          { error: 'Valid userId is required', code: 'INVALID_USER_ID' },
          { status: 400 }
        );
      }
      conditions.push(eq(loyaltyRewards.userId, parseInt(userId)));
    }
    if (orderId) {
      if (isNaN(parseInt(orderId))) {
        return NextResponse.json(
          { error: 'Valid orderId is required', code: 'INVALID_ORDER_ID' },
          { status: 400 }
        );
      }
      conditions.push(eq(loyaltyRewards.orderId, parseInt(orderId)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const sortColumn = loyaltyRewards[sortField as keyof typeof loyaltyRewards] || loyaltyRewards.createdAt;
    if (sortOrder === 'asc') {
      query = query.orderBy(asc(sortColumn));
    } else {
      query = query.orderBy(desc(sortColumn));
    }

    const results = await query.limit(limit).offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, pointsEarned, pointsSpent, description, orderId } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required', code: 'MISSING_USER_ID' },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        { error: 'description is required', code: 'MISSING_DESCRIPTION' },
        { status: 400 }
      );
    }

    // Validate userId is a valid integer
    if (isNaN(parseInt(userId.toString()))) {
      return NextResponse.json(
        { error: 'userId must be a valid integer', code: 'INVALID_USER_ID' },
        { status: 400 }
      );
    }

    // Validate pointsEarned
    const validatedPointsEarned = pointsEarned !== undefined ? parseInt(pointsEarned.toString()) : 0;
    if (isNaN(validatedPointsEarned) || validatedPointsEarned < 0) {
      return NextResponse.json(
        { error: 'pointsEarned must be a non-negative integer', code: 'INVALID_POINTS_EARNED' },
        { status: 400 }
      );
    }

    // Validate pointsSpent
    const validatedPointsSpent = pointsSpent !== undefined ? parseInt(pointsSpent.toString()) : 0;
    if (isNaN(validatedPointsSpent) || validatedPointsSpent < 0) {
      return NextResponse.json(
        { error: 'pointsSpent must be a non-negative integer', code: 'INVALID_POINTS_SPENT' },
        { status: 400 }
      );
    }

    // Validate orderId if provided
    let validatedOrderId = null;
    if (orderId !== undefined && orderId !== null) {
      validatedOrderId = parseInt(orderId.toString());
      if (isNaN(validatedOrderId)) {
        return NextResponse.json(
          { error: 'orderId must be a valid integer', code: 'INVALID_ORDER_ID' },
          { status: 400 }
        );
      }
    }

    // Prepare insert data
    const insertData = {
      userId: parseInt(userId.toString()),
      pointsEarned: validatedPointsEarned,
      pointsSpent: validatedPointsSpent,
      description: description.toString().trim(),
      orderId: validatedOrderId,
      createdAt: new Date().toISOString(),
    };

    const newReward = await db.insert(loyaltyRewards).values(insertData).returning();

    return NextResponse.json(newReward[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { pointsEarned, pointsSpent, description, orderId } = body;

    // Check if record exists
    const existing = await db
      .select()
      .from(loyaltyRewards)
      .where(eq(loyaltyRewards.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Loyalty reward not found', code: 'REWARD_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updates: any = {};

    if (pointsEarned !== undefined) {
      const validatedPointsEarned = parseInt(pointsEarned.toString());
      if (isNaN(validatedPointsEarned) || validatedPointsEarned < 0) {
        return NextResponse.json(
          { error: 'pointsEarned must be a non-negative integer', code: 'INVALID_POINTS_EARNED' },
          { status: 400 }
        );
      }
      updates.pointsEarned = validatedPointsEarned;
    }

    if (pointsSpent !== undefined) {
      const validatedPointsSpent = parseInt(pointsSpent.toString());
      if (isNaN(validatedPointsSpent) || validatedPointsSpent < 0) {
        return NextResponse.json(
          { error: 'pointsSpent must be a non-negative integer', code: 'INVALID_POINTS_SPENT' },
          { status: 400 }
        );
      }
      updates.pointsSpent = validatedPointsSpent;
    }

    if (description !== undefined) {
      if (!description || description.toString().trim() === '') {
        return NextResponse.json(
          { error: 'description cannot be empty', code: 'INVALID_DESCRIPTION' },
          { status: 400 }
        );
      }
      updates.description = description.toString().trim();
    }

    if (orderId !== undefined) {
      if (orderId === null) {
        updates.orderId = null;
      } else {
        const validatedOrderId = parseInt(orderId.toString());
        if (isNaN(validatedOrderId)) {
          return NextResponse.json(
            { error: 'orderId must be a valid integer', code: 'INVALID_ORDER_ID' },
            { status: 400 }
          );
        }
        updates.orderId = validatedOrderId;
      }
    }

    const updated = await db
      .update(loyaltyRewards)
      .set(updates)
      .where(eq(loyaltyRewards.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if record exists
    const existing = await db
      .select()
      .from(loyaltyRewards)
      .where(eq(loyaltyRewards.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Loyalty reward not found', code: 'REWARD_NOT_FOUND' },
        { status: 404 }
      );
    }

    const deleted = await db
      .delete(loyaltyRewards)
      .where(eq(loyaltyRewards.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      {
        message: 'Loyalty reward deleted successfully',
        deleted: deleted[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}