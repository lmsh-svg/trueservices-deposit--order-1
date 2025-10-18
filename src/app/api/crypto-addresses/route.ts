import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { cryptoAddresses } from '@/db/schema';
import { eq, and, like } from 'drizzle-orm';

const VALID_CRYPTOCURRENCIES = ['bitcoin', 'ethereum', 'dogecoin', 'litecoin', 'usdt'];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const address = await db
        .select()
        .from(cryptoAddresses)
        .where(eq(cryptoAddresses.id, parseInt(id)))
        .limit(1);

      if (address.length === 0) {
        return NextResponse.json(
          { error: 'Crypto address not found', code: 'ADDRESS_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(address[0], { status: 200 });
    }

    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const cryptocurrency = searchParams.get('cryptocurrency');
    const isActive = searchParams.get('isActive');

    let query = db.select().from(cryptoAddresses);

    const conditions = [];

    if (cryptocurrency) {
      if (!VALID_CRYPTOCURRENCIES.includes(cryptocurrency)) {
        return NextResponse.json(
          { 
            error: 'Invalid cryptocurrency type', 
            code: 'INVALID_CRYPTOCURRENCY',
            validValues: VALID_CRYPTOCURRENCIES 
          },
          { status: 400 }
        );
      }
      conditions.push(eq(cryptoAddresses.cryptocurrency, cryptocurrency));
    }

    if (isActive !== null && isActive !== undefined) {
      const isActiveBoolean = isActive === 'true' || isActive === '1';
      conditions.push(eq(cryptoAddresses.isActive, isActiveBoolean));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
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
    const { cryptocurrency, address, isActive } = body;

    if (!cryptocurrency) {
      return NextResponse.json(
        { error: 'Cryptocurrency is required', code: 'MISSING_CRYPTOCURRENCY' },
        { status: 400 }
      );
    }

    if (!VALID_CRYPTOCURRENCIES.includes(cryptocurrency)) {
      return NextResponse.json(
        { 
          error: 'Invalid cryptocurrency type', 
          code: 'INVALID_CRYPTOCURRENCY',
          validValues: VALID_CRYPTOCURRENCIES 
        },
        { status: 400 }
      );
    }

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required', code: 'MISSING_ADDRESS' },
        { status: 400 }
      );
    }

    const trimmedAddress = address.trim();
    if (!trimmedAddress) {
      return NextResponse.json(
        { error: 'Address cannot be empty', code: 'EMPTY_ADDRESS' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const newAddress = await db
      .insert(cryptoAddresses)
      .values({
        cryptocurrency: cryptocurrency.trim(),
        address: trimmedAddress,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(newAddress[0], { status: 201 });
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

    const existingAddress = await db
      .select()
      .from(cryptoAddresses)
      .where(eq(cryptoAddresses.id, parseInt(id)))
      .limit(1);

    if (existingAddress.length === 0) {
      return NextResponse.json(
        { error: 'Crypto address not found', code: 'ADDRESS_NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { cryptocurrency, address, isActive } = body;

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (cryptocurrency !== undefined) {
      if (!VALID_CRYPTOCURRENCIES.includes(cryptocurrency)) {
        return NextResponse.json(
          { 
            error: 'Invalid cryptocurrency type', 
            code: 'INVALID_CRYPTOCURRENCY',
            validValues: VALID_CRYPTOCURRENCIES 
          },
          { status: 400 }
        );
      }
      updates.cryptocurrency = cryptocurrency.trim();
    }

    if (address !== undefined) {
      const trimmedAddress = address.trim();
      if (!trimmedAddress) {
        return NextResponse.json(
          { error: 'Address cannot be empty', code: 'EMPTY_ADDRESS' },
          { status: 400 }
        );
      }
      updates.address = trimmedAddress;
    }

    if (isActive !== undefined) {
      updates.isActive = Boolean(isActive);
    }

    const updated = await db
      .update(cryptoAddresses)
      .set(updates)
      .where(eq(cryptoAddresses.id, parseInt(id)))
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

    const existingAddress = await db
      .select()
      .from(cryptoAddresses)
      .where(eq(cryptoAddresses.id, parseInt(id)))
      .limit(1);

    if (existingAddress.length === 0) {
      return NextResponse.json(
        { error: 'Crypto address not found', code: 'ADDRESS_NOT_FOUND' },
        { status: 404 }
      );
    }

    const deleted = await db
      .delete(cryptoAddresses)
      .where(eq(cryptoAddresses.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      {
        message: 'Crypto address deleted successfully',
        deletedAddress: deleted[0],
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