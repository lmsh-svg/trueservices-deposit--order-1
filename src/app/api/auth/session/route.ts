import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, session } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Helper function to extract session token from request
function getSessionToken(request: NextRequest): string | null {
  // Try to get from cookie first
  const cookieToken = request.cookies.get('better-auth.session_token')?.value;
  if (cookieToken) return cookieToken;

  // Try to get from Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    // Extract session token
    const token = getSessionToken(request);

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'No session token provided',
          code: 'NO_TOKEN',
        },
        { status: 401 }
      );
    }

    // Query session by token
    const sessionResult = await db
      .select()
      .from(session)
      .where(eq(session.token, token))
      .limit(1);

    if (sessionResult.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid session token',
          code: 'INVALID_SESSION',
        },
        { status: 401 }
      );
    }

    const sessionData = sessionResult[0];

    // Check if session is expired
    const currentTimestamp = Date.now();
    const expiresAtTimestamp = sessionData.expiresAt.getTime();

    if (expiresAtTimestamp <= currentTimestamp) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session has expired',
          code: 'EXPIRED_SESSION',
        },
        { status: 401 }
      );
    }

    // Query user data
    const userResult = await db
      .select()
      .from(user)
      .where(eq(user.id, sessionData.userId))
      .limit(1);

    if (userResult.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        },
        { status: 401 }
      );
    }

    const userData = userResult[0];

    // Return success response
    return NextResponse.json(
      {
        success: true,
        user: {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          emailVerified: userData.emailVerified,
        },
        session: {
          id: sessionData.id,
          expiresAt: expiresAtTimestamp,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET session verification error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error: ' + error,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Extract session token
    const token = getSessionToken(request);

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'No session token provided',
          code: 'NO_TOKEN',
        },
        { status: 401 }
      );
    }

    // Delete session from database
    const deletedSession = await db
      .delete(session)
      .where(eq(session.token, token))
      .returning();

    if (deletedSession.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session not found',
          code: 'SESSION_NOT_FOUND',
        },
        { status: 401 }
      );
    }

    // Create response with cleared cookie
    const response = NextResponse.json(
      {
        success: true,
        message: 'Signed out successfully',
      },
      { status: 200 }
    );

    // Clear the session cookie
    response.cookies.set('better-auth.session_token', '', {
      maxAge: 0,
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return response;
  } catch (error) {
    console.error('DELETE session error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error: ' + error,
      },
      { status: 500 }
    );
  }
}