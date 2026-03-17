import { supabase } from '@/lib/supabase';

/**
 * Esprit Mileage System (Gamification Points)
 * These functions require Supabase RPC (Remote Procedure Calls) to securely 
 * increment points on the database side and prevent race conditions.
 */

// 1. Point constants based on actions
export const MILEAGE_RULES = {
  DAILY_ATTENDANCE: 10,
  POST_CREATION: 50,
  RECEIVED_LIKE: 5,
  COMMENT_CREATION: 5,
  COMMENT_FIRST_BLOOD: 15,
};

/**
 * Increment a user's points securely via RPC.
 * @param userId UUID of the user
 * @param event Action type (e.g. 'POST_CREATION')
 */
export async function awardMileage(userId: string, event: keyof typeof MILEAGE_RULES) {
  const pointsToAward = MILEAGE_RULES[event];
  
  try {
    const { error } = await supabase.rpc('increment_mileage', {
      target_user_id: userId,
      points_to_add: pointsToAward
    });

    if (error) throw error;
    console.log(`Awarded ${pointsToAward} points to ${userId} for ${event}`);
  } catch (error) {
    console.error('Error awarding mileage:', error);
  }
}

/**
 * Note: Provide the following SQL to the user to run in Supabase SQL Editor:
 * 
 * CREATE OR REPLACE FUNCTION increment_mileage(target_user_id UUID, points_to_add INT)
 * RETURNS void
 * LANGUAGE plpgsql
 * SECURITY DEFINER
 * AS $$
 * BEGIN
 *   UPDATE profiles
 *   SET points = points + points_to_add
 *   WHERE id = target_user_id;
 * END;
 * $$;
 */
