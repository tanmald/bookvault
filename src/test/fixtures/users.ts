import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Test users with predictable credentials
export const testUsers = {
  owner: {
    email: "test-owner@test.local",
    password: "TestPass123!",
    displayName: "Test Owner",
  },
  member: {
    email: "test-member@test.local",
    password: "TestPass123!",
    displayName: "Test Member",
  },
  admin: {
    email: "test-admin@test.local",
    password: "TestPass123!",
    displayName: "Test Admin",
  },
  invitee: {
    email: "test-invitee@test.local",
    password: "TestPass123!",
    displayName: "Test Invitee",
  },
} as const;

// Test library data
export const testLibraries = {
  personal: {
    name: "Test Personal Library",
    description: "A test library for personal use",
    is_public: false,
    allow_member_uploads: true,
  },
  shared: {
    name: "Test Shared Library",
    description: "A test library for sharing with members",
    is_public: true,
    allow_member_uploads: false,
  },
} as const;

// Test book data
export const testBooks = {
  book1: {
    title: "Test Book One",
    author: "Test Author",
    description: "A test book description",
    year: 2024,
    genre_id: null as string | null,
  },
  book2: {
    title: "Test Book Two",
    author: "Another Author",
    description: "Another test book",
    year: 2023,
    genre_id: null as string | null,
  },
} as const;

// Helper to create a test user
export async function createTestUser(
  userKey: keyof typeof testUsers
): Promise<{ user: unknown; error: Error | null }> {
  const userData = testUsers[userKey];
  const { data, error } = await supabase.auth.signUp({
    email: userData.email,
    password: userData.password,
    options: {
      data: {
        display_name: userData.displayName,
      },
    },
  });

  return { user: data.user, error };
}

// Helper to sign in a test user
export async function signInTestUser(
  userKey: keyof typeof testUsers
): Promise<{ user: unknown; error: Error | null }> {
  const userData = testUsers[userKey];
  const { data, error } = await supabase.auth.signInWithPassword({
    email: userData.email,
    password: userData.password,
  });

  return { user: data.user, error };
}

// Helper to sign out current user
export async function signOutUser(): Promise<void> {
  await supabase.auth.signOut();
}

// Helper to create a library
export async function createTestLibrary(
  libraryKey: keyof typeof testLibraries,
  ownerId: string
): Promise<{ library: unknown; error: Error | null }> {
  const libData = testLibraries[libraryKey];
  const { data, error } = await supabase
    .from("libraries")
    .insert({
      ...libData,
      created_by: ownerId,
    })
    .select()
    .single();

  return { library: data, error };
}

// Helper to get current auth session
export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}
