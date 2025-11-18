import { NextRequest } from 'next/server';
import { whopSdk } from './whop-sdk';
import { UserService } from './services/user-service';
import type { User } from './types/database';

export async function getUserFromRequest(request: NextRequest): Promise<User | null> {
  try {
    const headers = request.headers;

    // Try to get user from Whop token
    const tokenResult = await whopSdk.verifyUserToken(headers);

    // Get company ID from headers
    const companyId = headers.get('x-whop-company-id') || headers.get('whop-company-id');

    // Get or create user in database
    const user = await UserService.getOrCreateUser({
      id: tokenResult.userId,
      companyId: companyId || undefined,
    });

    return user;
  } catch (error) {
    console.error('Auth error:', error);

    // Development fallback - use env variables
    if (process.env.NODE_ENV === 'development') {
      const devUserId = process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID || 'user_5x9k4ZJpf1ZK2';
      const devCompanyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;

      try {
        // Try to get or create dev user
        const user = await UserService.getOrCreateUser({
          id: devUserId,
          companyId: devCompanyId,
        });
        return user;
      } catch (err) {
        console.error('Failed to get dev user:', err);
        return null;
      }
    }

    return null;
  }
}
