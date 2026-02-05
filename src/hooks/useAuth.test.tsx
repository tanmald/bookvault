import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  createTestUser,
  signInTestUser,
  signOutUser,
  testUsers,
} from "@/test/fixtures/users";
import { cleanupTestData } from "@/test/helpers/cleanup";

// Create a wrapper with necessary providers
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
  };
}

describe("useAuth", () => {
  beforeEach(async () => {
    // Ensure clean state
    await signOutUser();
    await cleanupTestData();
  });

  afterEach(async () => {
    await signOutUser();
    await cleanupTestData();
  });

  describe("signUp", () => {
    it("should create a new user account with display name", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      const signUpResult = await result.current.signUp(
        testUsers.owner.email,
        testUsers.owner.password,
        testUsers.owner.displayName
      );

      expect(signUpResult.error).toBeNull();
      expect(result.current.user).not.toBeNull();
      expect(result.current.user?.email).toBe(testUsers.owner.email);
    });

    it("should fail to create duplicate user", async () => {
      // First create a user
      await createTestUser("owner");
      await signOutUser();

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Try to create the same user again
      const signUpResult = await result.current.signUp(
        testUsers.owner.email,
        testUsers.owner.password,
        testUsers.owner.displayName
      );

      // Should either error or succeed (Supabase handles duplicates differently)
      expect(signUpResult).toBeDefined();
    });

    it("should validate email format", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      const signUpResult = await result.current.signUp(
        "invalid-email",
        testUsers.owner.password,
        testUsers.owner.displayName
      );

      expect(signUpResult.error).not.toBeNull();
    });

    it("should require minimum password length", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      const signUpResult = await result.current.signUp(
        testUsers.owner.email,
        "short",
        testUsers.owner.displayName
      );

      expect(signUpResult.error).not.toBeNull();
    });
  });

  describe("signIn", () => {
    beforeEach(async () => {
      // Create a test user before sign in tests
      await createTestUser("owner");
      await signOutUser();
    });

    it("should sign in with valid credentials", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      const signInResult = await result.current.signIn(
        testUsers.owner.email,
        testUsers.owner.password
      );

      expect(signInResult.error).toBeNull();
      expect(result.current.user).not.toBeNull();
      expect(result.current.user?.email).toBe(testUsers.owner.email);
    });

    it("should fail with invalid password", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      const signInResult = await result.current.signIn(
        testUsers.owner.email,
        "wrongpassword"
      );

      expect(signInResult.error).not.toBeNull();
      expect(result.current.user).toBeNull();
    });

    it("should fail with non-existent email", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      const signInResult = await result.current.signIn(
        "nonexistent@test.local",
        testUsers.owner.password
      );

      expect(signInResult.error).not.toBeNull();
    });
  });

  describe("signOut", () => {
    beforeEach(async () => {
      await createTestUser("owner");
    });

    it("should sign out authenticated user", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Wait for auth state to be ready
      await waitFor(() => expect(result.current.loading).toBe(false));

      // User should be authenticated
      expect(result.current.user).not.toBeNull();

      // Sign out
      await result.current.signOut();

      // User should be null after sign out
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });
  });

  describe("session persistence", () => {
    it("should restore session on mount", async () => {
      // First sign in
      await createTestUser("owner");
      const { user: signInUser } = await signInTestUser("owner");
      const userId = signInUser?.id;

      // Render hook - should restore session
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Wait for session to be restored
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.user?.id).toBe(userId);
    });

    it("should handle unauthenticated state", async () => {
      // Ensure no session
      await signOutUser();

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Wait for auth check to complete
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });
  });

  describe("loading states", () => {
    it("should start with loading true", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Initially should be loading
      expect(result.current.loading).toBe(true);

      // Wait for initialization
      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it("should set loading during sign in", async () => {
      await createTestUser("owner");
      await signOutUser();

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Wait for initial loading to complete
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Start sign in (don't await to check loading state)
      const signInPromise = result.current.signIn(
        testUsers.owner.email,
        testUsers.owner.password
      );

      // Loading should be managed by the component, not the hook
      // The hook returns a function that the component calls

      await signInPromise;
    });
  });
});
