import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { transactions, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { transactionId } = await request.json();

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required', code: 'MISSING_TRANSACTION_ID' },
        { status: 400 }
      );
    }

    // Fetch transaction from database
    const transaction = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, parseInt(transactionId)))
      .limit(1);

    if (transaction.length === 0) {
      return NextResponse.json(
        { error: 'Transaction not found', code: 'TRANSACTION_NOT_FOUND' },
        { status: 404 }
      );
    }

    const txData = transaction[0];

    // Check if already verified
    if (txData.status === 'verified') {
      return NextResponse.json(
        { error: 'Transaction already verified and credited', code: 'ALREADY_VERIFIED' },
        { status: 400 }
      );
    }

    // Verify transaction via mempool API (Bitcoin only for now)
    if (txData.cryptocurrency === 'bitcoin') {
      try {
        const mempoolResponse = await fetch(
          `https://mempool.space/api/tx/${txData.transactionHash}`
        );

        if (!mempoolResponse.ok) {
          return NextResponse.json(
            { 
              error: 'Transaction not found on blockchain', 
              code: 'TX_NOT_FOUND_ON_CHAIN',
              message: 'The transaction could not be verified on the blockchain. Please ensure you have sent the transaction and it has been confirmed.'
            },
            { status: 400 }
          );
        }

        const mempoolData = await mempoolResponse.json();

        // Check if transaction is confirmed (has at least 1 confirmation)
        if (!mempoolData.status || !mempoolData.status.confirmed) {
          return NextResponse.json(
            { 
              error: 'Transaction not yet confirmed', 
              code: 'TX_UNCONFIRMED',
              message: 'Your transaction is pending confirmation. Please wait for at least 1 blockchain confirmation and try again.'
            },
            { status: 400 }
          );
        }

        // Verify the transaction was sent to one of our addresses
        const cryptoAddresses = await db.query.cryptoAddresses.findMany({
          where: and(
            eq(db.query.cryptoAddresses.cryptocurrency, 'bitcoin'),
            eq(db.query.cryptoAddresses.isActive, true)
          )
        });

        const ourAddresses = cryptoAddresses.map(addr => addr.address);
        const transactionOutputs = mempoolData.vout || [];
        
        let matchedAddress = false;
        for (const output of transactionOutputs) {
          if (output.scriptpubkey_address && ourAddresses.includes(output.scriptpubkey_address)) {
            matchedAddress = true;
            break;
          }
        }

        if (!matchedAddress) {
          return NextResponse.json(
            { 
              error: 'Transaction was not sent to our address', 
              code: 'INVALID_RECIPIENT',
              message: 'The transaction was not sent to one of our cryptocurrency addresses. Please ensure you sent to the correct address.'
            },
            { status: 400 }
          );
        }

      } catch (error) {
        console.error('Mempool verification error:', error);
        return NextResponse.json(
          { 
            error: 'Failed to verify transaction with blockchain', 
            code: 'VERIFICATION_FAILED',
            message: 'We could not verify your transaction at this time. Please try again later.'
          },
          { status: 500 }
        );
      }
    }

    // Update transaction status to verified
    const now = new Date().toISOString();
    await db
      .update(transactions)
      .set({
        status: 'verified',
        verifiedAt: now,
        updatedAt: now,
      })
      .where(eq(transactions.id, txData.id));

    // Credit user account with the USD amount from the transaction
    // The amount stored in the transaction is the USD value at the time they made the deposit
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, txData.userId))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    const currentBalance = user[0].balance || 0;
    const newBalance = currentBalance + txData.amount;

    await db
      .update(users)
      .set({
        balance: newBalance,
        updatedAt: now,
      })
      .where(eq(users.id, txData.userId));

    return NextResponse.json({
      success: true,
      message: 'Transaction verified and account credited',
      transaction: {
        id: txData.id,
        amount: txData.amount,
        status: 'verified',
        verifiedAt: now,
      },
      newBalance,
    });

  } catch (error) {
    console.error('Transaction verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}