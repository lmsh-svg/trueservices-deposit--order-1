import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { orderItems } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single order item fetch
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const orderItem = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.id, parseInt(id)))
        .limit(1);

      if (orderItem.length === 0) {
        return NextResponse.json(
          { error: 'Order item not found', code: 'ORDER_ITEM_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(orderItem[0], { status: 200 });
    }

    // List order items with pagination and filtering
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const orderId = searchParams.get('orderId');
    const productId = searchParams.get('productId');

    let query = db.select().from(orderItems);

    // Apply filters
    const filters = [];
    if (orderId) {
      if (isNaN(parseInt(orderId))) {
        return NextResponse.json(
          { error: 'Valid orderId is required', code: 'INVALID_ORDER_ID' },
          { status: 400 }
        );
      }
      filters.push(eq(orderItems.orderId, parseInt(orderId)));
    }
    if (productId) {
      if (isNaN(parseInt(productId))) {
        return NextResponse.json(
          { error: 'Valid productId is required', code: 'INVALID_PRODUCT_ID' },
          { status: 400 }
        );
      }
      filters.push(eq(orderItems.productId, parseInt(productId)));
    }

    if (filters.length > 0) {
      query = query.where(and(...filters));
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
    const { orderId, productId, quantity, priceAtPurchase } = body;

    // Validation: Required fields
    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId is required', code: 'MISSING_ORDER_ID' },
        { status: 400 }
      );
    }

    if (!quantity) {
      return NextResponse.json(
        { error: 'quantity is required', code: 'MISSING_QUANTITY' },
        { status: 400 }
      );
    }

    if (priceAtPurchase === undefined || priceAtPurchase === null) {
      return NextResponse.json(
        { error: 'priceAtPurchase is required', code: 'MISSING_PRICE_AT_PURCHASE' },
        { status: 400 }
      );
    }

    // Validation: orderId must be valid integer
    if (isNaN(parseInt(orderId))) {
      return NextResponse.json(
        { error: 'orderId must be a valid integer', code: 'INVALID_ORDER_ID' },
        { status: 400 }
      );
    }

    // Validation: quantity must be positive integer
    if (isNaN(parseInt(quantity)) || parseInt(quantity) <= 0) {
      return NextResponse.json(
        { error: 'quantity must be a positive integer', code: 'INVALID_QUANTITY' },
        { status: 400 }
      );
    }

    // Validation: priceAtPurchase must be positive number
    if (isNaN(parseFloat(priceAtPurchase)) || parseFloat(priceAtPurchase) <= 0) {
      return NextResponse.json(
        { error: 'priceAtPurchase must be a positive number', code: 'INVALID_PRICE' },
        { status: 400 }
      );
    }

    // Validation: productId if provided must be valid integer
    if (productId !== undefined && productId !== null && isNaN(parseInt(productId))) {
      return NextResponse.json(
        { error: 'productId must be a valid integer', code: 'INVALID_PRODUCT_ID' },
        { status: 400 }
      );
    }

    // Prepare insert data
    const insertData: any = {
      orderId: parseInt(orderId),
      quantity: parseInt(quantity),
      priceAtPurchase: parseFloat(priceAtPurchase),
      createdAt: new Date().toISOString(),
    };

    if (productId !== undefined && productId !== null) {
      insertData.productId = parseInt(productId);
    }

    const newOrderItem = await db
      .insert(orderItems)
      .values(insertData)
      .returning();

    return NextResponse.json(newOrderItem[0], { status: 201 });
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

    // Validation: ID is required
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if order item exists
    const existingOrderItem = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.id, parseInt(id)))
      .limit(1);

    if (existingOrderItem.length === 0) {
      return NextResponse.json(
        { error: 'Order item not found', code: 'ORDER_ITEM_NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { quantity, priceAtPurchase, productId } = body;

    // Prepare update data
    const updateData: any = {};

    // Validation and assignment for quantity
    if (quantity !== undefined) {
      if (isNaN(parseInt(quantity)) || parseInt(quantity) <= 0) {
        return NextResponse.json(
          { error: 'quantity must be a positive integer', code: 'INVALID_QUANTITY' },
          { status: 400 }
        );
      }
      updateData.quantity = parseInt(quantity);
    }

    // Validation and assignment for priceAtPurchase
    if (priceAtPurchase !== undefined) {
      if (isNaN(parseFloat(priceAtPurchase)) || parseFloat(priceAtPurchase) <= 0) {
        return NextResponse.json(
          { error: 'priceAtPurchase must be a positive number', code: 'INVALID_PRICE' },
          { status: 400 }
        );
      }
      updateData.priceAtPurchase = parseFloat(priceAtPurchase);
    }

    // Validation and assignment for productId
    if (productId !== undefined) {
      if (productId !== null && isNaN(parseInt(productId))) {
        return NextResponse.json(
          { error: 'productId must be a valid integer or null', code: 'INVALID_PRODUCT_ID' },
          { status: 400 }
        );
      }
      updateData.productId = productId === null ? null : parseInt(productId);
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update', code: 'NO_UPDATE_FIELDS' },
        { status: 400 }
      );
    }

    const updatedOrderItem = await db
      .update(orderItems)
      .set(updateData)
      .where(eq(orderItems.id, parseInt(id)))
      .returning();

    if (updatedOrderItem.length === 0) {
      return NextResponse.json(
        { error: 'Order item not found', code: 'ORDER_ITEM_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedOrderItem[0], { status: 200 });
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

    // Validation: ID is required
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if order item exists before deletion
    const existingOrderItem = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.id, parseInt(id)))
      .limit(1);

    if (existingOrderItem.length === 0) {
      return NextResponse.json(
        { error: 'Order item not found', code: 'ORDER_ITEM_NOT_FOUND' },
        { status: 404 }
      );
    }

    const deleted = await db
      .delete(orderItems)
      .where(eq(orderItems.id, parseInt(id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Order item not found', code: 'ORDER_ITEM_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: 'Order item deleted successfully',
        deletedOrderItem: deleted[0],
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