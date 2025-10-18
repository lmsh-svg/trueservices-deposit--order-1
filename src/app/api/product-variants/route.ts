import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { productVariants, products } from '@/db/schema';
import { eq, and, gte, lte, desc, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      if (isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const variant = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.id, parseInt(id)))
        .limit(1);

      if (variant.length === 0) {
        return NextResponse.json(
          { error: 'Product variant not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(variant[0], { status: 200 });
    }

    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const productId = searchParams.get('productId');
    const minDenomination = searchParams.get('minDenomination');
    const maxDenomination = searchParams.get('maxDenomination');
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

    let query = db.select().from(productVariants);

    const conditions = [];

    if (productId) {
      const parsedProductId = parseInt(productId);
      if (!isNaN(parsedProductId)) {
        conditions.push(eq(productVariants.productId, parsedProductId));
      }
    }

    if (minDenomination) {
      const parsedMin = parseFloat(minDenomination);
      if (!isNaN(parsedMin)) {
        conditions.push(gte(productVariants.denomination, parsedMin));
      }
    }

    if (maxDenomination) {
      const parsedMax = parseFloat(maxDenomination);
      if (!isNaN(parsedMax)) {
        conditions.push(lte(productVariants.denomination, parsedMax));
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const sortColumn = sort === 'denomination' ? productVariants.denomination :
                       sort === 'customerPrice' ? productVariants.customerPrice :
                       sort === 'adminCost' ? productVariants.adminCost :
                       sort === 'stockQuantity' ? productVariants.stockQuantity :
                       sort === 'updatedAt' ? productVariants.updatedAt :
                       productVariants.createdAt;

    const orderFn = order === 'asc' ? asc : desc;
    query = query.orderBy(orderFn(sortColumn));

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
    const { productId, denomination, customerPrice, adminCost, stockQuantity } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required', code: 'MISSING_PRODUCT_ID' },
        { status: 400 }
      );
    }

    if (typeof productId !== 'number' || !Number.isInteger(productId)) {
      return NextResponse.json(
        { error: 'Product ID must be a valid integer', code: 'INVALID_PRODUCT_ID' },
        { status: 400 }
      );
    }

    if (denomination === undefined || denomination === null) {
      return NextResponse.json(
        { error: 'Denomination is required', code: 'MISSING_DENOMINATION' },
        { status: 400 }
      );
    }

    if (typeof denomination !== 'number' || denomination <= 0) {
      return NextResponse.json(
        { error: 'Denomination must be a positive number', code: 'INVALID_DENOMINATION' },
        { status: 400 }
      );
    }

    if (customerPrice === undefined || customerPrice === null) {
      return NextResponse.json(
        { error: 'Customer price is required', code: 'MISSING_CUSTOMER_PRICE' },
        { status: 400 }
      );
    }

    if (typeof customerPrice !== 'number' || customerPrice <= 0) {
      return NextResponse.json(
        { error: 'Customer price must be a positive number', code: 'INVALID_CUSTOMER_PRICE' },
        { status: 400 }
      );
    }

    if (adminCost === undefined || adminCost === null) {
      return NextResponse.json(
        { error: 'Admin cost is required', code: 'MISSING_ADMIN_COST' },
        { status: 400 }
      );
    }

    if (typeof adminCost !== 'number' || adminCost <= 0) {
      return NextResponse.json(
        { error: 'Admin cost must be a positive number', code: 'INVALID_ADMIN_COST' },
        { status: 400 }
      );
    }

    const finalStockQuantity = stockQuantity !== undefined ? stockQuantity : 0;

    if (typeof finalStockQuantity !== 'number' || !Number.isInteger(finalStockQuantity) || finalStockQuantity < 0) {
      return NextResponse.json(
        { error: 'Stock quantity must be a non-negative integer', code: 'INVALID_STOCK_QUANTITY' },
        { status: 400 }
      );
    }

    const productExists = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (productExists.length === 0) {
      return NextResponse.json(
        { error: 'Product not found', code: 'PRODUCT_NOT_FOUND' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const newVariant = await db
      .insert(productVariants)
      .values({
        productId,
        denomination,
        customerPrice,
        adminCost,
        stockQuantity: finalStockQuantity,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(newVariant[0], { status: 201 });
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

    const parsedId = parseInt(id);

    const existingVariant = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, parsedId))
      .limit(1);

    if (existingVariant.length === 0) {
      return NextResponse.json(
        { error: 'Product variant not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { denomination, customerPrice, adminCost, stockQuantity } = body;

    const updates: any = {};

    if (denomination !== undefined) {
      if (typeof denomination !== 'number' || denomination <= 0) {
        return NextResponse.json(
          { error: 'Denomination must be a positive number', code: 'INVALID_DENOMINATION' },
          { status: 400 }
        );
      }
      updates.denomination = denomination;
    }

    if (customerPrice !== undefined) {
      if (typeof customerPrice !== 'number' || customerPrice <= 0) {
        return NextResponse.json(
          { error: 'Customer price must be a positive number', code: 'INVALID_CUSTOMER_PRICE' },
          { status: 400 }
        );
      }
      updates.customerPrice = customerPrice;
    }

    if (adminCost !== undefined) {
      if (typeof adminCost !== 'number' || adminCost <= 0) {
        return NextResponse.json(
          { error: 'Admin cost must be a positive number', code: 'INVALID_ADMIN_COST' },
          { status: 400 }
        );
      }
      updates.adminCost = adminCost;
    }

    if (stockQuantity !== undefined) {
      if (typeof stockQuantity !== 'number' || !Number.isInteger(stockQuantity) || stockQuantity < 0) {
        return NextResponse.json(
          { error: 'Stock quantity must be a non-negative integer', code: 'INVALID_STOCK_QUANTITY' },
          { status: 400 }
        );
      }
      updates.stockQuantity = stockQuantity;
    }

    updates.updatedAt = new Date().toISOString();

    const updated = await db
      .update(productVariants)
      .set(updates)
      .where(eq(productVariants.id, parsedId))
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

    const parsedId = parseInt(id);

    const existingVariant = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, parsedId))
      .limit(1);

    if (existingVariant.length === 0) {
      return NextResponse.json(
        { error: 'Product variant not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const deleted = await db
      .delete(productVariants)
      .where(eq(productVariants.id, parsedId))
      .returning();

    return NextResponse.json(
      {
        message: 'Product variant deleted successfully',
        variant: deleted[0],
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