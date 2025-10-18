import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reviews } from '@/db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single review by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const review = await db
        .select()
        .from(reviews)
        .where(eq(reviews.id, parseInt(id)))
        .limit(1);

      if (review.length === 0) {
        return NextResponse.json(
          { error: 'Review not found', code: 'REVIEW_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(review[0], { status: 200 });
    }

    // List reviews with filters, pagination, and sorting
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const orderId = searchParams.get('orderId');
    const userId = searchParams.get('userId');
    const rating = searchParams.get('rating');
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

    let query = db.select().from(reviews);

    // Build filter conditions
    const conditions = [];
    if (orderId && !isNaN(parseInt(orderId))) {
      conditions.push(eq(reviews.orderId, parseInt(orderId)));
    }
    if (userId && !isNaN(parseInt(userId))) {
      conditions.push(eq(reviews.userId, parseInt(userId)));
    }
    if (rating && !isNaN(parseInt(rating))) {
      conditions.push(eq(reviews.rating, parseInt(rating)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const sortColumn = sort === 'rating' ? reviews.rating : reviews.createdAt;
    query = query.orderBy(order === 'asc' ? asc(sortColumn) : desc(sortColumn));

    // Apply pagination
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
    const { orderId, userId, rating, comment, photoUrl } = body;

    // Validation: required fields
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required', code: 'MISSING_ORDER_ID' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required', code: 'MISSING_USER_ID' },
        { status: 400 }
      );
    }

    if (rating === undefined || rating === null) {
      return NextResponse.json(
        { error: 'Rating is required', code: 'MISSING_RATING' },
        { status: 400 }
      );
    }

    // Validate orderId is a valid integer
    if (isNaN(parseInt(orderId))) {
      return NextResponse.json(
        { error: 'Order ID must be a valid integer', code: 'INVALID_ORDER_ID' },
        { status: 400 }
      );
    }

    // Validate userId is a valid integer
    if (isNaN(parseInt(userId))) {
      return NextResponse.json(
        { error: 'User ID must be a valid integer', code: 'INVALID_USER_ID' },
        { status: 400 }
      );
    }

    // Validate rating is between 1 and 5
    const ratingInt = parseInt(rating);
    if (isNaN(ratingInt) || ratingInt < 1 || ratingInt > 5) {
      return NextResponse.json(
        { error: 'Rating must be an integer between 1 and 5', code: 'INVALID_RATING' },
        { status: 400 }
      );
    }

    // Create review
    const timestamp = new Date().toISOString();
    const newReview = await db
      .insert(reviews)
      .values({
        orderId: parseInt(orderId),
        userId: parseInt(userId),
        rating: ratingInt,
        comment: comment || null,
        photoUrl: photoUrl || null,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .returning();

    return NextResponse.json(newReview[0], { status: 201 });
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

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if review exists
    const existingReview = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, parseInt(id)))
      .limit(1);

    if (existingReview.length === 0) {
      return NextResponse.json(
        { error: 'Review not found', code: 'REVIEW_NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { rating, comment, photoUrl } = body;

    // Validate rating if provided
    if (rating !== undefined && rating !== null) {
      const ratingInt = parseInt(rating);
      if (isNaN(ratingInt) || ratingInt < 1 || ratingInt > 5) {
        return NextResponse.json(
          { error: 'Rating must be an integer between 1 and 5', code: 'INVALID_RATING' },
          { status: 400 }
        );
      }
    }

    // Build update object
    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (rating !== undefined && rating !== null) {
      updates.rating = parseInt(rating);
    }
    if (comment !== undefined) {
      updates.comment = comment;
    }
    if (photoUrl !== undefined) {
      updates.photoUrl = photoUrl;
    }

    // Update review
    const updatedReview = await db
      .update(reviews)
      .set(updates)
      .where(eq(reviews.id, parseInt(id)))
      .returning();

    return NextResponse.json(updatedReview[0], { status: 200 });
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

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if review exists
    const existingReview = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, parseInt(id)))
      .limit(1);

    if (existingReview.length === 0) {
      return NextResponse.json(
        { error: 'Review not found', code: 'REVIEW_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Delete review
    const deletedReview = await db
      .delete(reviews)
      .where(eq(reviews.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      {
        message: 'Review deleted successfully',
        review: deletedReview[0],
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