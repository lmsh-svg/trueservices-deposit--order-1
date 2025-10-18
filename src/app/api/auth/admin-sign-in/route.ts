import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, account, session } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Email and password are required',
          code: 'MISSING_CREDENTIALS'
        },
        { status: 400 }
      );
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Email and password must be strings',
          code: 'INVALID_CREDENTIALS_TYPE'
        },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    if (!normalizedEmail) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Email cannot be empty',
          code: 'EMPTY_EMAIL'
        },
        { status: 400 }
      );
    }

    // Find user by email
    const userResult = await db.select()
      .from(user)
      .where(eq(user.email, normalizedEmail))
      .limit(1);

    if (userResult.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        },
        { status: 401 }
      );
    }

    const foundUser = userResult[0];

    // Find account with credential provider
    const accountResult = await db.select()
      .from(account)
      .where(
        and(
          eq(account.userId, foundUser.id),
          eq(account.providerId, 'credential')
        )
      )
      .limit(1);

    if (accountResult.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        },
        { status: 401 }
      );
    }

    const userAccount = accountResult[0];

    // Check if password exists in account
    if (!userAccount.password) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        },
        { status: 401 }
      );
    }

    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, userAccount.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        },
        { status: 401 }
      );
    }

    // Generate session data
    const sessionId = crypto.randomUUID();
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const expiresAt = currentTimestamp + (7 * 24 * 60 * 60); // 7 days in seconds

    // Get IP address from headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0].trim() || realIp || 'unknown';

    // Get user agent
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create session in database
    const newSession = await db.insert(session)
      .values({
        id: sessionId,
        token: sessionToken,
        userId: foundUser.id,
        expiresAt: new Date(expiresAt * 1000),
        createdAt: new Date(currentTimestamp * 1000),
        updatedAt: new Date(currentTimestamp * 1000),
        ipAddress,
        userAgent,
      })
      .returning();

    if (newSession.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to create session',
          code: 'SESSION_CREATION_FAILED'
        },
        { status: 500 }
      );
    }

    // Prepare response
    const userResponse = {
      id: foundUser.id,
      name: foundUser.name,
      email: foundUser.email,
      emailVerified: foundUser.emailVerified,
    };

    const sessionResponse = {
      id: newSession[0].id,
      token: newSession[0].token,
      expiresAt: expiresAt,
    };

    // Create response with Set-Cookie header
    const response = NextResponse.json(
      {
        success: true,
        user: userResponse,
        session: sessionResponse,
        message: 'Authentication successful',
      },
      { status: 200 }
    );

    // Set cookie with session token
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieValue = [
      `better-auth.session_token=${sessionToken}`,
      'HttpOnly',
      'Path=/',
      `Max-Age=${7 * 24 * 60 * 60}`,
      'SameSite=Lax',
      isProduction ? 'Secure' : '',
    ].filter(Boolean).join('; ');

    response.headers.set('Set-Cookie', cookieValue);

    return response;

  } catch (error) {
    console.error('POST /api/auth/admin error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error)),
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}