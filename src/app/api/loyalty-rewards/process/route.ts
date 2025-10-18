import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { loyaltyRewards, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { user_id, amount, description } = await request.json();

    if (!user_id || !amount) {
      return NextResponse.json(
        { success: false, message: "User ID and amount are required" },
        { status: 400 }
      );
    }

    // Calculate points: 1 point per $1 spent
    const pointsEarned = Math.floor(amount);

    // Create loyalty reward record
    const newReward = await db.insert(loyaltyRewards).values({
      user_id,
      points_earned: pointsEarned,
      points_spent: 0,
      description: description || `Purchase of $${amount.toFixed(2)}`,
    }).returning();

    // Update user's loyalty points balance
    const currentUser = await db.select().from(users).where(eq(users.id, user_id)).limit(1);
    
    if (currentUser.length > 0) {
      const newBalance = (currentUser[0].loyalty_points || 0) + pointsEarned;
      
      await db.update(users)
        .set({ loyalty_points: newBalance })
        .where(eq(users.id, user_id));
    }

    return NextResponse.json({
      success: true,
      message: `Awarded ${pointsEarned} loyalty points`,
      data: newReward[0],
      points_earned: pointsEarned,
    });
  } catch (error) {
    console.error("Error processing loyalty rewards:", error);
    return NextResponse.json(
      { success: false, message: "Failed to process loyalty rewards" },
      { status: 500 }
    );
  }
}