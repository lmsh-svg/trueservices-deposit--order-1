import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { services } from '@/db/schema';
import { eq, like, and, desc } from 'drizzle-orm';

const VALID_CATEGORIES = ['food_delivery', 'shopping', 'transportation', 'other'];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single service by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const service = await db
        .select()
        .from(services)
        .where(eq(services.id, parseInt(id)))
        .limit(1);

      if (service.length === 0) {
        return NextResponse.json(
          { error: 'Service not found', code: 'SERVICE_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(service[0], { status: 200 });
    }

    // List services with filters and pagination
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const isAvailable = searchParams.get('isAvailable');

    let query = db.select().from(services);

    const conditions = [];

    if (search) {
      conditions.push(like(services.name, `%${search}%`));
    }

    if (category) {
      if (!VALID_CATEGORIES.includes(category)) {
        return NextResponse.json(
          { error: 'Invalid category', code: 'INVALID_CATEGORY' },
          { status: 400 }
        );
      }
      conditions.push(eq(services.category, category));
    }

    if (isAvailable !== null && isAvailable !== undefined) {
      const availableValue = isAvailable === 'true' || isAvailable === '1';
      conditions.push(eq(services.isAvailable, availableValue));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(services.createdAt))
      .limit(limit)
      .offset(offset);

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
    const { name, category, description, isAvailable, discountPercentage, priceLimit, imageUrl, orderLink, browseLink } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required', code: 'MISSING_NAME' },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: 'Category is required', code: 'MISSING_CATEGORY' },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { 
          error: `Category must be one of: ${VALID_CATEGORIES.join(', ')}`, 
          code: 'INVALID_CATEGORY' 
        },
        { status: 400 }
      );
    }

    if (discountPercentage === undefined || discountPercentage === null) {
      return NextResponse.json(
        { error: 'Discount percentage is required', code: 'MISSING_DISCOUNT_PERCENTAGE' },
        { status: 400 }
      );
    }

    if (typeof discountPercentage !== 'number' || discountPercentage < 0 || discountPercentage > 100) {
      return NextResponse.json(
        { error: 'Discount percentage must be between 0 and 100', code: 'INVALID_DISCOUNT_PERCENTAGE' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const newService = await db
      .insert(services)
      .values({
        name: name.trim(),
        category,
        description: description?.trim() || null,
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
        discountPercentage: parseInt(discountPercentage.toString()),
        priceLimit: priceLimit !== undefined && priceLimit !== null ? parseFloat(priceLimit.toString()) : null,
        imageUrl: imageUrl?.trim() || null,
        orderLink: orderLink?.trim() || null,
        browseLink: browseLink?.trim() || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(newService[0], { status: 201 });
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
    const { name, category, description, isAvailable, discountPercentage, priceLimit, imageUrl, orderLink, browseLink } = body;

    // Check if service exists
    const existingService = await db
      .select()
      .from(services)
      .where(eq(services.id, parseInt(id)))
      .limit(1);

    if (existingService.length === 0) {
      return NextResponse.json(
        { error: 'Service not found', code: 'SERVICE_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Validate category if provided
    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { 
          error: `Category must be one of: ${VALID_CATEGORIES.join(', ')}`, 
          code: 'INVALID_CATEGORY' 
        },
        { status: 400 }
      );
    }

    // Validate discount percentage if provided
    if (discountPercentage !== undefined && discountPercentage !== null) {
      if (typeof discountPercentage !== 'number' || discountPercentage < 0 || discountPercentage > 100) {
        return NextResponse.json(
          { error: 'Discount percentage must be between 0 and 100', code: 'INVALID_DISCOUNT_PERCENTAGE' },
          { status: 400 }
        );
      }
    }

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name.trim();
    if (category !== undefined) updates.category = category;
    if (description !== undefined) updates.description = description?.trim() || null;
    if (isAvailable !== undefined) updates.isAvailable = Boolean(isAvailable);
    if (discountPercentage !== undefined) updates.discountPercentage = parseInt(discountPercentage.toString());
    if (priceLimit !== undefined) updates.priceLimit = priceLimit !== null ? parseFloat(priceLimit.toString()) : null;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl?.trim() || null;
    if (orderLink !== undefined) updates.orderLink = orderLink?.trim() || null;
    if (browseLink !== undefined) updates.browseLink = browseLink?.trim() || null;

    const updatedService = await db
      .update(services)
      .set(updates)
      .where(eq(services.id, parseInt(id)))
      .returning();

    if (updatedService.length === 0) {
      return NextResponse.json(
        { error: 'Service not found', code: 'SERVICE_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedService[0], { status: 200 });
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

    const deletedService = await db
      .delete(services)
      .where(eq(services.id, parseInt(id)))
      .returning();

    if (deletedService.length === 0) {
      return NextResponse.json(
        { error: 'Service not found', code: 'SERVICE_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: 'Service deleted successfully',
        service: deletedService[0],
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