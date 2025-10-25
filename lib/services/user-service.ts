import { db } from '../db/client';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { User, NewUser } from '../types/database';

export class UserService {
  /**
   * Get or create user from Whop data
   */
  static async getOrCreateUser(whopUserData: {
    id: string;
    email?: string;
    username?: string;
  }): Promise<User> {
    // Try to find existing user
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.whopUserId, whopUserData.id))
      .limit(1);

    if (existingUser) {
      // Update user info if changed
      if (
        whopUserData.email !== existingUser.email ||
        whopUserData.username !== existingUser.username
      ) {
        const [updated] = await db
          .update(users)
          .set({
            email: whopUserData.email || existingUser.email,
            username: whopUserData.username || existingUser.username,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id))
          .returning();

        return updated;
      }

      return existingUser;
    }

    // Create new user
    const newUser: NewUser = {
      whopUserId: whopUserData.id,
      whopCompanyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID!,
      email: whopUserData.email,
      username: whopUserData.username,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [created] = await db.insert(users).values(newUser).returning();

    return created;
  }

  /**
   * Get user by Whop user ID
   */
  static async getUserByWhopId(whopUserId: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.whopUserId, whopUserId))
      .limit(1);

    return user || null;
  }

  /**
   * Get user by internal ID
   */
  static async getUserById(id: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user || null;
  }

  /**
   * Update user company info
   */
  static async updateUserCompany(
    userId: string,
    companyId: string,
    companyName?: string
  ): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({
        whopCompanyId: companyId,
        companyName,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return updated;
  }
}
