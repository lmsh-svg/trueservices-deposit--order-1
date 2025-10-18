import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { discountCodes, products } from '@/db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single record fetch by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const record = await db.select()
        .from(discountCodes)
        .where(eq(discountCodes.id, parseInt(id)))
        .limit(1);

      if (record.length === 0) {
        return NextResponse.json({ 
          error: 'Discount code not found',
          code: "NOT_FOUND" 
        }, { status: 404 });
      }

      return NextResponse.json(record[0], { status: 200 });
    }

    // List with pagination, filtering, and sorting
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const code = searchParams.get('code');
    const isActiveParam = searchParams.get('isActive');
    const productId = searchParams.get('productId');
    const sortField = searchParams.get('sort') || 'createdAt';
    const sortOrder = searchParams.get('order') || 'desc';

    let query = db.select().from(discountCodes);

    // Build WHERE conditions
    const conditions = [];
    
    if (code) {
      conditions.push(eq(discountCodes.code, code));
    }
    
    if (isActiveParam !== null) {
      const isActiveValue = isActiveParam === 'true';
      conditions.push(eq(discountCodes.isActive, isActiveValue));
    }
    
    if (productId) {
      if (!isNaN(parseInt(productId))) {
        conditions.push(eq(discountCodes.productId, parseInt(productId)));
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const orderByColumn = sortField === 'createdAt' ? discountCodes.createdAt :
                          sortField === 'code' ? discountCodes.code :
                          sortField === 'discountPercentage' ? discountCodes.discountPercentage :
                          discountCodes.createdAt;

    if (sortOrder === 'asc') {
      query = query.orderBy(asc(orderByColumn));
    } else {
      query = query.orderBy(desc(orderByColumn));
    }

    const results = await query.limit(limit).offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, discountPercentage, isActive, productId, expiresAt } = body;

    // Validate required fields
    if (!code || code.trim() === '') {
      return NextResponse.json({ 
        error: "Code is required and cannot be empty",
        code: "CODE_REQUIRED" 
      }, { status: 400 });
    }

    if (discountPercentage === undefined || discountPercentage === null) {
      return NextResponse.json({ 
        error: "Discount percentage is required",
        code: "DISCOUNT_PERCENTAGE_REQUIRED" 
      }, { status: 400 });
    }

    // Validate discountPercentage range
    if (discountPercentage < 0 || discountPercentage > 100) {
      return NextResponse.json({ 
        error: "Discount percentage must be between 0 and 100",
        code: "INVALID_DISCOUNT_PERCENTAGE" 
      }, { status: 400 });
    }

    // Validate productId if provided
    if (productId !== undefined && productId !== null) {
      if (isNaN(parseInt(productId))) {
        return NextResponse.json({ 
          error: "Product ID must be a valid integer",
          code: "INVALID_PRODUCT_ID" 
        }, { status: 400 });
      }

      // Check if product exists
      const productExists = await db.select()
        .from(products)
        .where(eq(products.id, parseInt(productId)))
        .limit(1);

      if (productExists.length === 0) {
        return NextResponse.json({ 
          error: "Product not found",
          code: "PRODUCT_NOT_FOUND" 
        }, { status: 400 });
      }
    }

    // Validate expiresAt if provided
    if (expiresAt !== undefined && expiresAt !== null) {
      const expiresDate = new Date(expiresAt);
      if (isNaN(expiresDate.getTime())) {
        return NextResponse.json({ 
          error: "Invalid expiration date format",
          code: "INVALID_EXPIRES_AT" 
        }, { status: 400 });
      }
    }

    // Check if code already exists
    const existingCode = await db.select()
      .from(discountCodes)
      .where(eq(discountCodes.code, code.trim()))
      .limit(1);

    if (existingCode.length > 0) {
      return NextResponse.json({ 
        error: "Discount code already exists",
        code: "DUPLICATE_CODE" 
      }, { status: 400 });
    }

    // Prepare insert data
    const insertData: any = {
      code: code.trim(),
      discountPercentage,
      isActive: isActive !== undefined ? isActive : true,
      createdAt: new Date().toISOString()
    };

    if (productId !== undefined && productId !== null) {
      insertData.productId = parseInt(productId);
    }

    if (expiresAt !== undefined && expiresAt !== null) {
      insertData.expiresAt = expiresAt;
    }

    const newRecord = await db.insert(discountCodes)
      .values(insertData)
      .returning();

    return NextResponse.json(newRecord[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if record exists
    const existing = await db.select()
      .from(discountCodes)
      .where(eq(discountCodes.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Discount code not found',
        code: "NOT_FOUND" 
      }, { status: 404 });
    }

    const body = await request.json();
    const { code, discountPercentage, isActive, productId, expiresAt } = body;

    // Validate code if provided
    if (code !== undefined) {
      if (code.trim() === '') {
        return NextResponse.json({ 
          error: "Code cannot be empty",
          code: "CODE_EMPTY" 
        }, { status: 400 });
      }

      // Check if code is unique (excluding current record)
      const existingCode = await db.select()
        .from(discountCodes)
        .where(eq(discountCodes.code, code.trim()))
        .limit(1);

      if (existingCode.length > 0 && existingCode[0].id !== parseInt(id)) {
        return NextResponse.json({ 
          error: "Discount code already exists",
          code: "DUPLICATE_CODE" 
        }, { status: 400 });
      }
    }

    // Validate discountPercentage if provided
    if (discountPercentage !== undefined && discountPercentage !== null) {
      if (discountPercentage < 0 || discountPercentage > 100) {
        return NextResponse.json({ 
          error: "Discount percentage must be between 0 and 100",
          code: "INVALID_DISCOUNT_PERCENTAGE" 
        }, { status: 400 });
      }
    }

    // Validate productId if provided
    if (productId !== undefined && productId !== null) {
      if (isNaN(parseInt(productId))) {
        return NextResponse.json({ 
          error: "Product ID must be a valid integer",
          code: "INVALID_PRODUCT_ID" 
        }, { status: 400 });
      }

      // Check if product exists
      const productExists = await db.select()
        .from(products)
        .where(eq(products.id, parseInt(productId)))
        .limit(1);

      if (productExists.length === 0) {
        return NextResponse.json({ 
          error: "Product not found",
          code: "PRODUCT_NOT_FOUND" 
        }, { status: 400 });
      }
    }

    // Validate expiresAt if provided
    if (expiresAt !== undefined && expiresAt !== null && expiresAt !== '') {
      const expiresDate = new Date(expiresAt);
      if (isNaN(expiresDate.getTime())) {
        return NextResponse.json({ 
          error: "Invalid expiration date format",
          code: "INVALID_EXPIRES_AT" 
        }, { status: 400 });
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (code !== undefined) {
      updateData.code = code.trim();
    }

    if (discountPercentage !== undefined) {
      updateData.discountPercentage = discountPercentage;
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    if (productId !== undefined) {
      updateData.productId = productId === null ? null : parseInt(productId);
    }

    if (expiresAt !== undefined) {
      updateData.expiresAt = expiresAt === null || expiresAt === '' ? null : expiresAt;
    }

    const updated = await db.update(discountCodes)
      .set(updateData)
      .where(eq(discountCodes.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if record exists
    const existing = await db.select()
      .from(discountCodes)
      .where(eq(discountCodes.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Discount code not found',
        code: "NOT_FOUND" 
      }, { status: 404 });
    }

    const deleted = await db.delete(discountCodes)
      .where(eq(discountCodes.id, parseInt(id)))
      .returning();

    return NextResponse.json({ 
      message: 'Discount code deleted successfully',
      data: deleted[0]
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}