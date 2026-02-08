import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Friends from "@/pages/Friends";
import * as useLibraryMembersModule from "@/hooks/useLibraryMembers";
import * as useActivityFeedModule from "@/hooks/useActivityFeed";
import * as useLibraryModule from "@/contexts/LibraryContext";
import { BrowserRouter } from "react-router-dom";

vi.mock("@/hooks/useLibraryMembers");
vi.mock("@/hooks/useActivityFeed");
vi.mock("@/contexts/LibraryContext");

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "current-user-id", email: "test@test.com" },
    loading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "friends.title": "Friends",
        "friends.subtitle": "Manage your library and see friend activity",
        "friends.myLibrary": "My Library",
        "friends.recentActivity": "Recent Activity",
        "friends.empty": "No members yet",
        "friends.emptyDesc": "Invite friends to join your library",
        "friends.createInvite": "Create Invite",
        "friends.user": "User",
        "friends.since": "Member since",
        "friends.owner": "Owner",
        "friends.admin": "Admin",
        "friends.member": "Member",
        "friends.promoteAdmin": "Make Admin",
        "friends.demoteAdmin": "Remove Admin",
        "friends.kickMember": "Remove Member",
        "friends.kickTitle": "Remove Member?",
        "friends.kickDesc": "Remove {name} from the library?",
        "friends.kick": "Remove",
        "friends.startedReading": "started reading",
        "friends.finishedReading": "finished",
        "friends.reviewed": "reviewed",
        "friends.noActivity": "No recent activity",
        "common.cancel": "Cancel",
      };
      return translations[key] || key;
    },
    language: "en",
  }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="app-layout">{children}</div>,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

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
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </BrowserRouter>
    );
  };
}

describe("Friends Page", () => {
  const mockUseLibraryMembers = vi.mocked(useLibraryMembersModule.useLibraryMembers);
  const mockUseActivityFeed = vi.mocked(useActivityFeedModule.useActivityFeed);
  const mockUseLibrary = vi.mocked(useLibraryModule.useLibrary);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("CRITICAL: Left column shows library members", () => {
    it("should display library members from useLibraryMembers in left column", () => {
      mockUseLibrary.mockReturnValue({
        currentLibrary: {
          id: "lib-1",
          name: "My Library",
          created_by: "owner-id",
        },
        libraries: [],
        isLoading: false,
        createLibrary: vi.fn(),
        updateLibrary: vi.fn(),
        deleteLibrary: vi.fn(),
        refetch: vi.fn(),
        removeLibrary: vi.fn(),
        setCurrentLibrary: vi.fn(),
      });

      mockUseLibraryMembers.mockReturnValue({
        members: [
          {
            user_id: "member-1",
            display_name: "Alice",
            avatar_url: null,
            role: "admin",
            created_at: "2024-01-01",
          },
          {
            user_id: "member-2",
            display_name: "Bob",
            avatar_url: null,
            role: "member",
            created_at: "2024-01-02",
          },
        ],
        isLoading: false,
        isAdmin: true,
        promoteMember: { mutate: vi.fn(), isPending: false },
        demoteMember: { mutate: vi.fn(), isPending: false },
        removeMember: { mutate: vi.fn(), isPending: false },
        leaveLibrary: { mutate: vi.fn(), isPending: false },
      });

      mockUseActivityFeed.mockReturnValue({
        activities: [],
        isLoading: false,
        error: null,
      });

      render(<Friends />, { wrapper: createWrapper() });

      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.getByText("My Library (2)")).toBeInTheDocument();
    });

    it("should NOT mix friendships with library_members", () => {
      mockUseLibrary.mockReturnValue({
        currentLibrary: {
          id: "lib-1",
          name: "My Library",
          created_by: "owner-id",
        },
        libraries: [],
        isLoading: false,
        createLibrary: vi.fn(),
        updateLibrary: vi.fn(),
        deleteLibrary: vi.fn(),
        refetch: vi.fn(),
        removeLibrary: vi.fn(),
        setCurrentLibrary: vi.fn(),
      });

      mockUseLibraryMembers.mockReturnValue({
        members: [
          {
            user_id: "library-member-1",
            display_name: "Library Member",
            avatar_url: null,
            role: "member",
            created_at: "2024-01-01",
          },
        ],
        isLoading: false,
        isAdmin: false,
        promoteMember: { mutate: vi.fn(), isPending: false },
        demoteMember: { mutate: vi.fn(), isPending: false },
        removeMember: { mutate: vi.fn(), isPending: false },
        leaveLibrary: { mutate: vi.fn(), isPending: false },
      });

      mockUseActivityFeed.mockReturnValue({
        activities: [
          {
            id: "act-1",
            type: "reading",
            user_id: "friend-1",
            user_name: "Friend from Other Library",
            book_id: "book-1",
            book_title: "Some Book",
            created_at: "2024-01-03",
          },
        ],
        isLoading: false,
        error: null,
      });

      render(<Friends />, { wrapper: createWrapper() });

      expect(screen.getByText("Library Member")).toBeInTheDocument();
      expect(screen.getByText("Friend from Other Library")).toBeInTheDocument();
      const membersList = screen.getByText("My Library (1)");
      expect(membersList).toBeInTheDocument();
    });
  });

  describe("CRITICAL: Right column shows friendships activity", () => {
    it("should display activity from useActivityFeed in right column", () => {
      mockUseLibrary.mockReturnValue({
        currentLibrary: {
          id: "lib-1",
          name: "My Library",
          created_by: "owner-id",
        },
        libraries: [],
        isLoading: false,
        createLibrary: vi.fn(),
        updateLibrary: vi.fn(),
        deleteLibrary: vi.fn(),
        refetch: vi.fn(),
        removeLibrary: vi.fn(),
        setCurrentLibrary: vi.fn(),
      });

      mockUseLibraryMembers.mockReturnValue({
        members: [],
        isLoading: false,
        isAdmin: false,
        promoteMember: { mutate: vi.fn(), isPending: false },
        demoteMember: { mutate: vi.fn(), isPending: false },
        removeMember: { mutate: vi.fn(), isPending: false },
        leaveLibrary: { mutate: vi.fn(), isPending: false },
      });

      mockUseActivityFeed.mockReturnValue({
        activities: [
          {
            id: "act-1",
            type: "reading",
            user_id: "user-1",
            user_name: "Alice",
            book_id: "book-1",
            book_title: "The Great Book",
            created_at: "2024-01-03T10:00:00Z",
          },
          {
            id: "act-2",
            type: "finished",
            user_id: "user-2",
            user_name: "Bob",
            book_id: "book-2",
            book_title: "Another Book",
            created_at: "2024-01-02T10:00:00Z",
          },
        ],
        isLoading: false,
        error: null,
      });

      render(<Friends />, { wrapper: createWrapper() });

      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.getByText("The Great Book")).toBeInTheDocument();
      expect(screen.getByText("Another Book")).toBeInTheDocument();
    });
  });

  describe("Admin actions", () => {
    it("should show admin badges", () => {
      mockUseLibrary.mockReturnValue({
        currentLibrary: {
          id: "lib-1",
          name: "My Library",
          created_by: "owner-id",
        },
        libraries: [],
        isLoading: false,
        createLibrary: vi.fn(),
        updateLibrary: vi.fn(),
        deleteLibrary: vi.fn(),
        refetch: vi.fn(),
        removeLibrary: vi.fn(),
        setCurrentLibrary: vi.fn(),
      });

      mockUseLibraryMembers.mockReturnValue({
        members: [
          {
            user_id: "member-1",
            display_name: "Regular Member",
            avatar_url: null,
            role: "member",
            created_at: "2024-01-01",
          },
          {
            user_id: "admin-1",
            display_name: "Admin User",
            avatar_url: null,
            role: "admin",
            created_at: "2024-01-01",
          },
        ],
        isLoading: false,
        isAdmin: true,
        promoteMember: { mutate: vi.fn(), isPending: false },
        demoteMember: { mutate: vi.fn(), isPending: false },
        removeMember: { mutate: vi.fn(), isPending: false },
        leaveLibrary: { mutate: vi.fn(), isPending: false },
      });

      mockUseActivityFeed.mockReturnValue({
        activities: [],
        isLoading: false,
        error: null,
      });

      render(<Friends />, { wrapper: createWrapper() });

      expect(screen.getByText("Admin")).toBeInTheDocument();
      expect(screen.getByText("Member")).toBeInTheDocument();
    });

    it("should show owner badge", () => {
      mockUseLibrary.mockReturnValue({
        currentLibrary: {
          id: "lib-1",
          name: "My Library",
          created_by: "owner-id",
        },
        libraries: [],
        isLoading: false,
        createLibrary: vi.fn(),
        updateLibrary: vi.fn(),
        deleteLibrary: vi.fn(),
        refetch: vi.fn(),
        removeLibrary: vi.fn(),
        setCurrentLibrary: vi.fn(),
      });

      mockUseLibraryMembers.mockReturnValue({
        members: [
          {
            user_id: "owner-id",
            display_name: "Library Owner",
            avatar_url: null,
            role: "admin",
            created_at: "2024-01-01",
          },
        ],
        isLoading: false,
        isAdmin: true,
        promoteMember: { mutate: vi.fn(), isPending: false },
        demoteMember: { mutate: vi.fn(), isPending: false },
        removeMember: { mutate: vi.fn(), isPending: false },
        leaveLibrary: { mutate: vi.fn(), isPending: false },
      });

      mockUseActivityFeed.mockReturnValue({
        activities: [],
        isLoading: false,
        error: null,
      });

      render(<Friends />, { wrapper: createWrapper() });

      expect(screen.getByText("Owner")).toBeInTheDocument();
    });
  });

  describe("Empty states", () => {
    it("should show empty state when no library members", () => {
      mockUseLibrary.mockReturnValue({
        currentLibrary: {
          id: "lib-1",
          name: "My Library",
          created_by: "owner-id",
        },
        libraries: [],
        isLoading: false,
        createLibrary: vi.fn(),
        updateLibrary: vi.fn(),
        deleteLibrary: vi.fn(),
        refetch: vi.fn(),
        removeLibrary: vi.fn(),
        setCurrentLibrary: vi.fn(),
      });

      mockUseLibraryMembers.mockReturnValue({
        members: [],
        isLoading: false,
        isAdmin: false,
        promoteMember: { mutate: vi.fn(), isPending: false },
        demoteMember: { mutate: vi.fn(), isPending: false },
        removeMember: { mutate: vi.fn(), isPending: false },
        leaveLibrary: { mutate: vi.fn(), isPending: false },
      });

      mockUseActivityFeed.mockReturnValue({
        activities: [],
        isLoading: false,
        error: null,
      });

      render(<Friends />, { wrapper: createWrapper() });

      expect(screen.getByText("No members yet")).toBeInTheDocument();
      expect(screen.getByText("Invite friends to join your library")).toBeInTheDocument();
    });

    it("should show empty state when no activity", () => {
      mockUseLibrary.mockReturnValue({
        currentLibrary: {
          id: "lib-1",
          name: "My Library",
          created_by: "owner-id",
        },
        libraries: [],
        isLoading: false,
        createLibrary: vi.fn(),
        updateLibrary: vi.fn(),
        deleteLibrary: vi.fn(),
        refetch: vi.fn(),
        removeLibrary: vi.fn(),
        setCurrentLibrary: vi.fn(),
      });

      mockUseLibraryMembers.mockReturnValue({
        members: [
          {
            user_id: "member-1",
            display_name: "Alice",
            avatar_url: null,
            role: "member",
            created_at: "2024-01-01",
          },
        ],
        isLoading: false,
        isAdmin: false,
        promoteMember: { mutate: vi.fn(), isPending: false },
        demoteMember: { mutate: vi.fn(), isPending: false },
        removeMember: { mutate: vi.fn(), isPending: false },
        leaveLibrary: { mutate: vi.fn(), isPending: false },
      });

      mockUseActivityFeed.mockReturnValue({
        activities: [],
        isLoading: false,
        error: null,
      });

      render(<Friends />, { wrapper: createWrapper() });

      expect(screen.getByText("No recent activity")).toBeInTheDocument();
    });
  });
});
