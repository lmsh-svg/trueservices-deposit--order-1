import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { profitMargins, products } from '@/db/schema';
import { eq, desc, asc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const productId = searchParams.get('productId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const sort = searchParams.get('sort') || 'updatedAt';
    const order = searchParams.get('order') || 'desc';

    // Single record by ID
    if (id) {
      if (isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const record = await db
        .select()
        .from(profitMargins)
        .where(eq(profitMargins.id, parseInt(id)))
        .limit(1);

      if (record.length === 0) {
        return NextResponse.json(
          { error: 'Profit margin not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(record[0], { status: 200 });
    }

    // List with optional filtering
    let query = db.select().from(profitMargins);

    // Filter by productId if provided
    if (productId) {
      if (isNaN(parseInt(productId))) {
        return NextResponse.json(
          { error: 'Valid product ID is required', code: 'INVALID_PRODUCT_ID' },
          { status: 400 }
        );
      }
      query = query.where(eq(profitMargins.productId, parseInt(productId)));
    }

    // Apply sorting
    const orderFn = order === 'asc' ? asc : desc;
    const sortColumn = sort === 'id' ? profitMargins.id : profitMargins.updatedAt;
    query = query.orderBy(orderFn(sortColumn));

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
    const { productId, adminDiscountPercentage, customerDiscountPercentage } = body;

    // Validate required fields
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required', code: 'MISSING_PRODUCT_ID' },
        { status: 400 }
      );
    }

    // Validate productId is valid integer
    if (isNaN(parseInt(productId))) {
      return NextResponse.json(
        { error: 'Product ID must be a valid integer', code: 'INVALID_PRODUCT_ID' },
        { status: 400 }
      );
    }

    // Verify product exists
    const productExists = await db
      .select()
      .from(products)
      .where(eq(products.id, parseInt(productId)))
      .limit(1);

    if (productExists.length === 0) {
      return NextResponse.json(
        { error: 'Product not found', code: 'PRODUCT_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Validate adminDiscountPercentage if provided
    const adminDiscount = adminDiscountPercentage !== undefined 
      ? parseFloat(adminDiscountPercentage) 
      : 36;

    if (isNaN(adminDiscount) || adminDiscount < 0 || adminDiscount > 100) {
      return NextResponse.json(
        { 
          error: 'Admin discount percentage must be between 0 and 100', 
          code: 'INVALID_ADMIN_DISCOUNT' 
        },
        { status: 400 }
      );
    }

    // Validate customerDiscountPercentage if provided
    const customerDiscount = customerDiscountPercentage !== undefined 
      ? parseFloat(customerDiscountPercentage) 
      : 30;

    if (isNaN(customerDiscount) || customerDiscount < 0 || customerDiscount > 100) {
      return NextResponse.json(
        { 
          error: 'Customer discount percentage must be between 0 and 100', 
          code: 'INVALID_CUSTOMER_DISCOUNT' 
        },
        { status: 400 }
      );
    }

    // Create new profit margin
    const newProfitMargin = await db
      .insert(profitMargins)
      .values({
        productId: parseInt(productId),
        adminDiscountPercentage: adminDiscount,
        customerDiscountPercentage: customerDiscount,
        updatedAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(newProfitMargin[0], { status: 201 });
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if record exists
    const existingRecord = await db
      .select()
      .from(profitMargins)
      .where(eq(profitMargins.id, parseInt(id)))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json(
        { error: 'Profit margin not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { adminDiscountPercentage, customerDiscountPercentage } = body;

    // Prepare update object
    const updates: {
      adminDiscountPercentage?: number;
      customerDiscountPercentage?: number;
      updatedAt: string;
    } = {
      updatedAt: new Date().toISOString(),
    };

    // Validate and add adminDiscountPercentage if provided
    if (adminDiscountPercentage !== undefined) {
      const adminDiscount = parseFloat(adminDiscountPercentage);
      if (isNaN(adminDiscount) || adminDiscount < 0 || adminDiscount > 100) {
        return NextResponse.json(
          { 
            error: 'Admin discount percentage must be between 0 and 100', 
            code: 'INVALID_ADMIN_DISCOUNT' 
          },
          { status: 400 }
        );
      }
      updates.adminDiscountPercentage = adminDiscount;
    }

    // Validate and add customerDiscountPercentage if provided
    if (customerDiscountPercentage !== undefined) {
      const customerDiscount = parseFloat(customerDiscountPercentage);
      if (isNaN(customerDiscount) || customerDiscount < 0 || customerDiscount > 100) {
        return NextResponse.json(
          { 
            error: 'Customer discount percentage must be between 0 and 100', 
            code: 'INVALID_CUSTOMER_DISCOUNT' 
          },
          { status: 400 }
        );
      }
      updates.customerDiscountPercentage = customerDiscount;
    }

    // Update the record
    const updated = await db
      .update(profitMargins)
      .set(updates)
      .where(eq(profitMargins.id, parseInt(id)))
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if record exists
    const existingRecord = await db
      .select()
      .from(profitMargins)
      .where(eq(profitMargins.id, parseInt(id)))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json(
        { error: 'Profit margin not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Delete the record
    const deleted = await db
      .delete(profitMargins)
      .where(eq(profitMargins.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      {
        message: 'Profit margin deleted successfully',
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