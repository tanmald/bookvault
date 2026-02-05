import { supabase } from "@/integrations/supabase/client";

/**
 * Cleans up test data from the database
 * Run this after tests to ensure clean state
 */
export async function cleanupTestData() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return;

  // Delete test books created by this user
  await supabase.from("books").delete().eq("owner_id", user.id);

  // Delete test invite links
  await supabase.from("invite_links").delete().eq("owner_id", user.id);

  // Note: Libraries and members are handled by cascading deletes
  // Reading progress is per-user and will be cleaned up automatically
}

/**
 * Signs out and cleans up current test user
 */
export async function cleanupTestUser() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user?.email?.includes("@test.local")) {
    // Delete user's profile (cascades to other data)
    await supabase.from("profiles").delete().eq("user_id", user.id);
  }

  await supabase.auth.signOut();
}

/**
 * Truncate all test tables (use with caution!)
 * Only use this in test environments
 */
export async function truncateTestTables() {
  // This should only be run against local Supabase
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user?.email?.includes("@test.local")) {
    await supabase.from("reading_progress").delete().eq("user_id", user.id);
  }
}
