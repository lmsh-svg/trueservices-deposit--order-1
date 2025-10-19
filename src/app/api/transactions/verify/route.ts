import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { transactions, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { calculateTransactionValue, hasMinimumConfirmations } from '@/lib/mempool';

export async function POST(request: NextRequest) {
  try {
    const { transactionHash, cryptocurrency, userId, targetAddress } = await request.json();

    if (!transactionHash || !cryptocurrency || !userId || !targetAddress) {
      return NextResponse.json(
        { 
          error: 'Missing required fields', 
          code: 'MISSING_FIELDS' 
        },
        { status: 400 }
      );
    }

    // Validate and parse userId
    const parsedUserId = parseInt(userId);
    if (isNaN(parsedUserId) || parsedUserId <= 0) {
      console.error('Invalid userId:', userId, 'parsed:', parsedUserId);
      return NextResponse.json(
        { 
          error: 'Invalid user ID', 
          code: 'INVALID_USER_ID' 
        },
        { status: 400 }
      );
    }

    // Check for duplicate transaction hash
    const existingTx = await db
      .select()
      .from(transactions)
      .where(eq(transactions.transactionHash, transactionHash))
      .limit(1);

    if (existingTx.length > 0) {
      return NextResponse.json(
        { 
          error: 'This transaction has already been submitted and credited', 
          code: 'DUPLICATE_TRANSACTION' 
        },
        { status: 400 }
      );
    }

    // Verify transaction on blockchain using mempool.space API
    if (cryptocurrency === 'bitcoin') {
      try {
        // Calculate transaction value with historical pricing
        const txData = await calculateTransactionValue(transactionHash, targetAddress);

        if (!txData.confirmed) {
          return NextResponse.json(
            {
              error: 'Transaction not yet confirmed',
              code: 'UNCONFIRMED',
              confirmations: 0,
              required: 2,
            },
            { status: 400 }
          );
        }

        // Check minimum confirmations (2+)
        if (txData.confirmations < 2) {
          return NextResponse.json(
            {
              error: `Transaction needs ${2 - txData.confirmations} more confirmation(s)`,
              code: 'INSUFFICIENT_CONFIRMATIONS',
              current: txData.confirmations,
              required: 2,
              btcAmount: txData.btcAmount,
              usdAmount: txData.usdAmount,
            },
            { status: 400 }
          );
        }

        // Transaction verified with 2+ confirmations - create record and credit user
        const now = new Date().toISOString();

        // Create transaction record
        await db.insert(transactions).values({
          userId: parsedUserId,
          cryptocurrency,
          amount: txData.usdAmount,
          transactionHash,
          status: 'verified',
          verifiedAt: now,
          createdAt: now,
          updatedAt: now,
        });

        // Credit user account
        const user = await db
          .select()
          .from(users)
          .where(eq(users.id, parsedUserId))
          .limit(1);

        if (user.length === 0) {
          return NextResponse.json(
            { error: 'User not found', code: 'USER_NOT_FOUND' },
            { status: 404 }
          );
        }

        const currentBalance = user[0].balance || 0;
        const newBalance = currentBalance + txData.usdAmount;

        await db
          .update(users)
          .set({
            balance: newBalance,
            updatedAt: now,
          })
          .where(eq(users.id, parsedUserId));

        return NextResponse.json({
          success: true,
          message: 'Transaction verified and credited',
          btcAmount: txData.btcAmount,
          usdAmount: txData.usdAmount,
          confirmations: txData.confirmations,
          timestamp: txData.timestamp,
          newBalance,
        });

      } catch (error: any) {
        console.error('Mempool verification error:', error);
        
        if (error.message.includes('not found')) {
          return NextResponse.json(
            { 
              error: 'Transaction not found on blockchain', 
              code: 'TX_NOT_FOUND' 
            },
            { status: 404 }
          );
        }
        
        if (error.message.includes('not sent to')) {
          return NextResponse.json(
            { 
              error: 'Transaction was not sent to our address', 
              code: 'INVALID_RECIPIENT' 
            },
            { status: 400 }
          );
        }

        return NextResponse.json(
          { 
            error: 'Failed to verify transaction with blockchain', 
            code: 'VERIFICATION_FAILED',
            details: error.message,
          },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { 
          error: 'Cryptocurrency not supported for automatic verification', 
          code: 'UNSUPPORTED_CRYPTO' 
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Transaction verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}