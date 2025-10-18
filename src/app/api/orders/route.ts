import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { eq, desc, asc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single order by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({
          error: 'Valid ID is required',
          code: 'INVALID_ID'
        }, { status: 400 });
      }

      const order = await db.select()
        .from(orders)
        .where(eq(orders.id, parseInt(id)))
        .limit(1);

      if (order.length === 0) {
        return NextResponse.json({
          error: 'Order not found',
          code: 'ORDER_NOT_FOUND'
        }, { status: 404 });
      }

      return NextResponse.json(order[0], { status: 200 });
    }

    // List orders with filtering, pagination, and sorting
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const userId = searchParams.get('userId');
    const paymentStatus = searchParams.get('paymentStatus');
    const deliveryStatus = searchParams.get('deliveryStatus');
    const orderType = searchParams.get('orderType');
    const sortField = searchParams.get('sort') || 'createdAt';
    const sortOrder = searchParams.get('order') || 'desc';

    let query = db.select().from(orders);

    // Build filter conditions
    const conditions = [];
    if (userId) {
      conditions.push(eq(orders.userId, parseInt(userId)));
    }
    if (paymentStatus) {
      conditions.push(eq(orders.paymentStatus, paymentStatus));
    }
    if (deliveryStatus) {
      conditions.push(eq(orders.deliveryStatus, deliveryStatus));
    }
    if (orderType) {
      conditions.push(eq(orders.orderType, orderType));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const orderByColumn = sortField === 'totalAmount' ? orders.totalAmount :
                         sortField === 'paymentStatus' ? orders.paymentStatus :
                         sortField === 'deliveryStatus' ? orders.deliveryStatus :
                         orders.createdAt;
    
    query = query.orderBy(sortOrder === 'asc' ? asc(orderByColumn) : desc(orderByColumn));

    // Apply pagination
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
    const { userId, orderType, serviceId, totalAmount, paymentStatus, deliveryStatus, transactionHash, cryptocurrencyUsed } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json({
        error: 'userId is required',
        code: 'MISSING_USER_ID'
      }, { status: 400 });
    }

    if (!orderType) {
      return NextResponse.json({
        error: 'orderType is required',
        code: 'MISSING_ORDER_TYPE'
      }, { status: 400 });
    }

    if (!totalAmount) {
      return NextResponse.json({
        error: 'totalAmount is required',
        code: 'MISSING_TOTAL_AMOUNT'
      }, { status: 400 });
    }

    // Validate orderType
    if (orderType !== 'service' && orderType !== 'product') {
      return NextResponse.json({
        error: 'orderType must be either "service" or "product"',
        code: 'INVALID_ORDER_TYPE'
      }, { status: 400 });
    }

    // Validate totalAmount
    if (typeof totalAmount !== 'number' || totalAmount <= 0) {
      return NextResponse.json({
        error: 'totalAmount must be a positive number',
        code: 'INVALID_TOTAL_AMOUNT'
      }, { status: 400 });
    }

    // Validate serviceId if orderType is service
    if (orderType === 'service' && !serviceId) {
      return NextResponse.json({
        error: 'serviceId is required when orderType is "service"',
        code: 'MISSING_SERVICE_ID'
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    const newOrder = await db.insert(orders).values({
      userId: parseInt(userId),
      orderType,
      serviceId: serviceId ? parseInt(serviceId) : null,
      totalAmount,
      paymentStatus: paymentStatus || 'pending',
      deliveryStatus: deliveryStatus || 'pending',
      transactionHash: transactionHash || null,
      cryptocurrencyUsed: cryptocurrencyUsed || null,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return NextResponse.json(newOrder[0], { status: 201 });
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
        error: 'Valid ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    // Check if order exists
    const existingOrder = await db.select()
      .from(orders)
      .where(eq(orders.id, parseInt(id)))
      .limit(1);

    if (existingOrder.length === 0) {
      return NextResponse.json({
        error: 'Order not found',
        code: 'ORDER_NOT_FOUND'
      }, { status: 404 });
    }

    const body = await request.json();
    const { paymentStatus, deliveryStatus, transactionHash, cryptocurrencyUsed } = body;

    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (paymentStatus !== undefined) {
      const validPaymentStatuses = ['pending', 'confirmed', 'completed', 'refunded'];
      if (!validPaymentStatuses.includes(paymentStatus)) {
        return NextResponse.json({
          error: 'Invalid paymentStatus. Must be one of: pending, confirmed, completed, refunded',
          code: 'INVALID_PAYMENT_STATUS'
        }, { status: 400 });
      }
      updates.paymentStatus = paymentStatus;
    }

    if (deliveryStatus !== undefined) {
      const validDeliveryStatuses = ['pending', 'processing', 'in_transit', 'delivered', 'cancelled'];
      if (!validDeliveryStatuses.includes(deliveryStatus)) {
        return NextResponse.json({
          error: 'Invalid deliveryStatus. Must be one of: pending, processing, in_transit, delivered, cancelled',
          code: 'INVALID_DELIVERY_STATUS'
        }, { status: 400 });
      }
      updates.deliveryStatus = deliveryStatus;
    }

    if (transactionHash !== undefined) {
      updates.transactionHash = transactionHash;
    }

    if (cryptocurrencyUsed !== undefined) {
      updates.cryptocurrencyUsed = cryptocurrencyUsed;
    }

    const updated = await db.update(orders)
      .set(updates)
      .where(eq(orders.id, parseInt(id)))
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
        error: 'Valid ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    // Check if order exists
    const existingOrder = await db.select()
      .from(orders)
      .where(eq(orders.id, parseInt(id)))
      .limit(1);

    if (existingOrder.length === 0) {
      return NextResponse.json({
        error: 'Order not found',
        code: 'ORDER_NOT_FOUND'
      }, { status: 404 });
    }

    const deleted = await db.delete(orders)
      .where(eq(orders.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      message: 'Order deleted successfully',
      order: deleted[0]
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}