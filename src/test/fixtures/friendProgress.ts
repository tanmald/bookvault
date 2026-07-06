import { FriendProgress } from "@/hooks/useFriendsBookProgress";

export const mockFriendProgress: FriendProgress[] = [
  {
    user_id: "owner-user-id",
    display_name: "Library Owner",
    avatar_url: null,
    status: "read",
    progress: 100,
    started_at: "2024-01-01T00:00:00Z",
    finished_at: "2024-01-03T00:00:00Z",
    reading_time_days: 2,
    review_id: null,
    review_rating: null,
    review_text: null,
  },
  {
    user_id: "admin-user-id",
    display_name: "Admin User",
    avatar_url: "https://example.com/avatar1.jpg",
    status: "read",
    progress: 100,
    started_at: "2024-01-01T00:00:00Z",
    finished_at: "2024-01-05T00:00:00Z",
    reading_time_days: 4,
    review_id: null,
    review_rating: null,
    review_text: null,
  },
  {
    user_id: "member-user-id",
    display_name: "Regular Member",
    avatar_url: null,
    status: "reading",
    progress: 75,
    started_at: "2024-01-10T00:00:00Z",
    finished_at: null,
    reading_time_days: null,
    review_id: null,
    review_rating: null,
    review_text: null,
  },
  {
    user_id: "slow-reader-id",
    display_name: "Slow Reader",
    avatar_url: null,
    status: "reading",
    progress: 25,
    started_at: "2024-01-10T00:00:00Z",
    finished_at: null,
    reading_time_days: null,
    review_id: null,
    review_rating: null,
    review_text: null,
  },
  {
    user_id: "to-read-user-id",
    display_name: "Zebra User",
    avatar_url: null,
    status: "to_read",
    progress: 0,
    started_at: null,
    finished_at: null,
    reading_time_days: null,
    review_id: null,
    review_rating: null,
    review_text: null,
  },
  {
    user_id: "another-to-read-id",
    display_name: "Apple User",
    avatar_url: null,
    status: "to_read",
    progress: 0,
    started_at: null,
    finished_at: null,
    reading_time_days: null,
    review_id: null,
    review_rating: null,
    review_text: null,
  },
];

export const mockEligibleFriendProgress: FriendProgress[] =
  mockFriendProgress.filter(
    (fp) => fp.status === "read" || fp.status === "reading" || fp.status === "to_read"
  );

export const createMockFriendProgress = (
  overrides: Partial<FriendProgress> = {}
): FriendProgress => ({
  user_id: `user-${Date.now()}`,
  display_name: "Test User",
  avatar_url: null,
  status: "to_read",
  progress: 0,
  started_at: null,
  finished_at: null,
  reading_time_days: null,
  review_id: null,
  review_rating: null,
  review_text: null,
  ...overrides,
});
