import { NextRequest, NextResponse } from 'next/server';
import { logoutUser } from '@/lib/services/auth.service';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value;

    if (refreshToken) {
      await logoutUser(refreshToken);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
