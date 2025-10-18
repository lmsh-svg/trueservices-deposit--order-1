import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { transactions, users } from '@/db/schema';
import { eq, and, or, desc, asc, like } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single transaction fetch
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const transaction = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, parseInt(id)))
        .limit(1);

      if (transaction.length === 0) {
        return NextResponse.json(
          { error: 'Transaction not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(transaction[0], { status: 200 });
    }

    // List transactions with filters, pagination, and sorting
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const userIdFilter = searchParams.get('userId');
    const statusFilter = searchParams.get('status');
    const cryptocurrencyFilter = searchParams.get('cryptocurrency');
    const sortField = searchParams.get('sort') || 'createdAt';
    const sortOrder = searchParams.get('order') || 'desc';

    let query = db.select().from(transactions);

    // Build filter conditions
    const conditions = [];
    if (userIdFilter) {
      conditions.push(eq(transactions.userId, parseInt(userIdFilter)));
    }
    if (statusFilter) {
      conditions.push(eq(transactions.status, statusFilter));
    }
    if (cryptocurrencyFilter) {
      conditions.push(eq(transactions.cryptocurrency, cryptocurrencyFilter));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const orderColumn = sortField === 'createdAt' ? transactions.createdAt : transactions.updatedAt;
    const orderFn = sortOrder === 'asc' ? asc : desc;
    query = query.orderBy(orderFn(orderColumn));

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
    const { userId, cryptocurrency, amount, transactionHash, status } = body;

    // Validation: Required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required', code: 'MISSING_USER_ID' },
        { status: 400 }
      );
    }

    if (!cryptocurrency) {
      return NextResponse.json(
        { error: 'cryptocurrency is required', code: 'MISSING_CRYPTOCURRENCY' },
        { status: 400 }
      );
    }

    if (amount === undefined || amount === null) {
      return NextResponse.json(
        { error: 'amount is required', code: 'MISSING_AMOUNT' },
        { status: 400 }
      );
    }

    if (!transactionHash) {
      return NextResponse.json(
        { error: 'transactionHash is required', code: 'MISSING_TRANSACTION_HASH' },
        { status: 400 }
      );
    }

    // Validation: Amount must be positive
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'amount must be a positive number', code: 'INVALID_AMOUNT' },
        { status: 400 }
      );
    }

    // Validation: Check if userId exists
    const userExists = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(userId)))
      .limit(1);

    if (userExists.length === 0) {
      return NextResponse.json(
        { error: 'User not found', code: 'INVALID_USER_ID' },
        { status: 400 }
      );
    }

    // Validation: Check if transactionHash is unique
    const existingTransaction = await db
      .select()
      .from(transactions)
      .where(eq(transactions.transactionHash, transactionHash))
      .limit(1);

    if (existingTransaction.length > 0) {
      return NextResponse.json(
        { error: 'Transaction hash already exists', code: 'DUPLICATE_TRANSACTION_HASH' },
        { status: 400 }
      );
    }

    // Create transaction
    const now = new Date().toISOString();
    const newTransaction = await db
      .insert(transactions)
      .values({
        userId: parseInt(userId),
        cryptocurrency: cryptocurrency.trim(),
        amount,
        transactionHash: transactionHash.trim(),
        status: status || 'pending',
        verifiedAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(newTransaction[0], { status: 201 });
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

    // Validation: ID is required
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if transaction exists
    const existingTransaction = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, parseInt(id)))
      .limit(1);

    if (existingTransaction.length === 0) {
      return NextResponse.json(
        { error: 'Transaction not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { status, verifiedAt } = body;

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (status !== undefined) {
      updateData.status = status;
      // Special logic: If status changed to 'verified', auto-set verifiedAt
      if (status === 'verified' && !existingTransaction[0].verifiedAt) {
        updateData.verifiedAt = new Date().toISOString();
      }
    }

    if (verifiedAt !== undefined) {
      updateData.verifiedAt = verifiedAt;
    }

    // Update transaction
    const updatedTransaction = await db
      .update(transactions)
      .set(updateData)
      .where(eq(transactions.id, parseInt(id)))
      .returning();

    return NextResponse.json(updatedTransaction[0], { status: 200 });
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

    // Validation: ID is required
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if transaction exists before deleting
    const existingTransaction = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, parseInt(id)))
      .limit(1);

    if (existingTransaction.length === 0) {
      return NextResponse.json(
        { error: 'Transaction not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Delete transaction
    const deleted = await db
      .delete(transactions)
      .where(eq(transactions.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      {
        message: 'Transaction deleted successfully',
        transaction: deleted[0],
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