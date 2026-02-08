import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FriendsScoreboard } from "./FriendsScoreboard";
import * as useFriendsBookProgressModule from "@/hooks/useFriendsBookProgress";
import { LanguageProvider } from "@/contexts/LanguageContext";

vi.mock("@/hooks/useFriendsBookProgress");

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "scoreboard.title": "Reading Race",
        "scoreboard.noFriends": "None of your friends in this library have read this book or are planning to read it!",
        "scoreboard.inviteFriends": "When your friends in this library start reading this book, you'll see their progress here.",
        "scoreboard.lessThanDay": "<1 day",
        "scoreboard.oneDay": "1 day",
        "scoreboard.days": "days",
        "scoreboard.read": "finished",
        "scoreboard.readPlural": "finished",
        "scoreboard.currentlyReading": "reading",
        "status.reading": "Reading",
        "status.toRead": "To Read",
        "friends.user": "User",
      };
      return translations[key] || key;
    },
    language: "en",
  }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>{children}</LanguageProvider>
      </QueryClientProvider>
    );
  };
}

describe("FriendsScoreboard", () => {
  const mockUseFriendsBookProgress = vi.mocked(useFriendsBookProgressModule.useFriendsBookProgress);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("CRITICAL: Library members only", () => {
    it("should render scoreboard with library members only", () => {
     mockUseFriendsBookProgress.mockReturnValue({
        data: [
          {
            user_id: "user-1",
            display_name: "Alice",
            avatar_url: null,
            status: "read",
            progress: 100,
            started_at: "2024-01-01",
            finished_at: "2024-01-05",
            reading_time_days: 4,
          },
          {
            user_id: "user-2",
            display_name: "Bob",
            avatar_url: null,
            status: "reading",
            progress: 50,
            started_at: "2024-01-03",
            finished_at: null,
            reading_time_days: null,
          },
          {
            user_id: "user-3",
            display_name: "Charlie",
            avatar_url: null,
            status: "to_read",
            progress: 0,
            started_at: null,
            finished_at: null,
            reading_time_days: null,
          },
        ],
        isLoading: false,
        error: null,
        isError: false,
        isPending: false,
        isSuccess: true,
        status: "success",
        fetchStatus: "idle",
        isFetching: false,
        isInitialLoading: false,
        isLoadingError: false,
        isRefetchError: false,
        isFetchPaused: false,
        isPlaceholderData: false,
        isStale: false,
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
        errorUpdateCount: 0,
        refetch: vi.fn(),
        promise: Promise.resolve([]),
      } as any);

      render(<FriendsScoreboard bookId="book-1" />, { wrapper: createWrapper() });

      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.getByText("Jan 5, 2024")).toBeInTheDocument();
      expect(screen.getByText("Reading")).toBeInTheDocument();
      expect(screen.getByText("To Read")).toBeInTheDocument();
    });

    it("should display correct status badges for different statuses", () => {
      mockUseFriendsBookProgress.mockReturnValue({
        data: [
          {
            user_id: "user-1",
            display_name: "Alice",
            avatar_url: null,
            status: "read",
            progress: 100,
            started_at: "2024-01-01",
            finished_at: "2024-01-05",
            reading_time_days: 4,
          },
          {
            user_id: "user-2",
            display_name: "Bob",
            avatar_url: null,
            status: "reading",
            progress: 50,
            started_at: "2024-01-03",
            finished_at: null,
            reading_time_days: null,
          },
          {
            user_id: "user-3",
            display_name: "Charlie",
            avatar_url: null,
            status: "to_read",
            progress: 0,
            started_at: null,
            finished_at: null,
            reading_time_days: null,
          },
        ],
        isLoading: false,
      } as any);

      render(<FriendsScoreboard bookId="book-1" />, { wrapper: createWrapper() });

      expect(screen.getByText("Jan 5, 2024")).toBeInTheDocument();
      expect(screen.getByText("Reading")).toBeInTheDocument();
      expect(screen.getByText("To Read")).toBeInTheDocument();
    });

    it("should show progress bars for reading status", () => {
      mockUseFriendsBookProgress.mockReturnValue({
        data: [
          {
            user_id: "user-1",
            display_name: "Bob",
            avatar_url: null,
            status: "reading",
            progress: 75,
            started_at: "2024-01-03",
            finished_at: null,
            reading_time_days: null,
          },
        ],
        isLoading: false,
      } as any);

      render(<FriendsScoreboard bookId="book-1" />, { wrapper: createWrapper() });

      expect(screen.getByText("75%")).toBeInTheDocument();
    });

    it("should show trophies for top 3 finishers", () => {
      mockUseFriendsBookProgress.mockReturnValue({
        data: [
          {
            user_id: "user-1",
            display_name: "First",
            avatar_url: null,
            status: "read",
            progress: 100,
            started_at: "2024-01-01",
            finished_at: "2024-01-02",
            reading_time_days: 1,
          },
          {
            user_id: "user-2",
            display_name: "Second",
            avatar_url: null,
            status: "read",
            progress: 100,
            started_at: "2024-01-01",
            finished_at: "2024-01-03",
            reading_time_days: 2,
          },
          {
            user_id: "user-3",
            display_name: "Third",
            avatar_url: null,
            status: "read",
            progress: 100,
            started_at: "2024-01-01",
            finished_at: "2024-01-04",
            reading_time_days: 3,
          },
          {
            user_id: "user-4",
            display_name: "Fourth",
            avatar_url: null,
            status: "read",
            progress: 100,
            started_at: "2024-01-01",
            finished_at: "2024-01-05",
            reading_time_days: 4,
          },
        ],
        isLoading: false,
      } as any);

      render(<FriendsScoreboard bookId="book-1" />, { wrapper: createWrapper() });

      expect(screen.getByText("4º")).toBeInTheDocument();
    });

    it("should NOT render members with not_planned status", () => {
      mockUseFriendsBookProgress.mockReturnValue({
        data: [
          {
            user_id: "user-1",
            display_name: "Active Reader",
            avatar_url: null,
            status: "reading",
            progress: 50,
            started_at: "2024-01-03",
            finished_at: null,
            reading_time_days: null,
          },
        ],
        isLoading: false,
      } as any);

      render(<FriendsScoreboard bookId="book-1" />, { wrapper: createWrapper() });

      expect(screen.getByText("Active Reader")).toBeInTheDocument();
    });

    it("should show empty state when no eligible members", () => {
      mockUseFriendsBookProgress.mockReturnValue({
        data: [],
        isLoading: false,
      } as any);

      render(<FriendsScoreboard bookId="book-1" />, { wrapper: createWrapper() });

      expect(screen.getByText("None of your friends in this library have read this book or are planning to read it!")).toBeInTheDocument();
      expect(screen.getByText("When your friends in this library start reading this book, you'll see their progress here.")).toBeInTheDocument();
    });
  });

  describe("Loading state", () => {
    it("should show skeleton loader when loading", () => {
      mockUseFriendsBookProgress.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any);

      const { container } = render(<FriendsScoreboard bookId="book-1" />, { wrapper: createWrapper() });

      const skeletons = container.querySelectorAll("[class*='skeleton']");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });
});
