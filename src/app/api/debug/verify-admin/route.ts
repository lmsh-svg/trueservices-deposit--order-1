import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json({ 
        error: "Email is required",
        code: "MISSING_EMAIL" 
      }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ 
        error: "Password is required",
        code: "MISSING_PASSWORD" 
      }, { status: 400 });
    }

    // Query user by email
    const userResult = await db.select()
      .from(user)
      .where(eq(user.email, email.toLowerCase().trim()))
      .limit(1);

    if (userResult.length === 0) {
      return NextResponse.json({
        success: false,
        user_exists: false,
        account_exists: false,
        password_matches: false,
        error: "User not found",
        code: "USER_NOT_FOUND"
      }, { status: 404 });
    }

    const foundUser = userResult[0];

    // Query account for the user
    const accountResult = await db.select()
      .from(account)
      .where(eq(account.userId, foundUser.id))
      .limit(1);

    if (accountResult.length === 0) {
      return NextResponse.json({
        success: false,
        user_exists: true,
        account_exists: false,
        password_matches: false,
        user_id: foundUser.id,
        email_verified: foundUser.emailVerified,
        error: "Account not found",
        code: "ACCOUNT_NOT_FOUND"
      }, { status: 404 });
    }

    const foundAccount = accountResult[0];

    // Check if password exists in account
    if (!foundAccount.password) {
      return NextResponse.json({
        success: false,
        user_exists: true,
        account_exists: true,
        password_matches: false,
        user_id: foundUser.id,
        email_verified: foundUser.emailVerified,
        provider_id: foundAccount.providerId,
        error: "No password set for this account",
        code: "NO_PASSWORD"
      }, { status: 404 });
    }

    // Verify password using bcrypt
    const passwordMatches = await bcrypt.compare(password, foundAccount.password);

    // Return detailed response
    return NextResponse.json({
      success: true,
      user_exists: true,
      account_exists: true,
      password_matches: passwordMatches,
      user_id: foundUser.id,
      email_verified: foundUser.emailVerified,
      provider_id: foundAccount.providerId
    }, { status: 200 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}