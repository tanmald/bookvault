import { Activity } from "@/hooks/useActivityFeed";

export const mockActivities: Activity[] = [
  {
    id: "activity-1",
    type: "reading",
    user_id: "friend-1",
    user_name: "Alice",
    avatar_url: null,
    book_id: "book-1",
    book_title: "The Great Gatsby",
    created_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "activity-2",
    type: "finished",
    user_id: "friend-2",
    user_name: "Bob",
    avatar_url: null,
    book_id: "book-2",
    book_title: "1984",
    created_at: "2024-01-14T15:30:00Z",
  },
  {
    id: "activity-3",
    type: "review",
    user_id: "friend-1",
    user_name: "Alice",
    avatar_url: null,
    book_id: "book-1",
    book_title: "The Great Gatsby",
    rating: 5,
    created_at: "2024-01-15T12:00:00Z",
  },
  {
    id: "activity-4",
    type: "reading",
    user_id: "friend-3",
    user_name: "Charlie",
    avatar_url: null,
    book_id: "book-3",
    book_title: "To Kill a Mockingbird",
    created_at: "2024-01-13T09:00:00Z",
  },
  {
    id: "activity-5",
    type: "review",
    user_id: "friend-2",
    user_name: "Bob",
    avatar_url: null,
    book_id: "book-2",
    book_title: "1984",
    rating: 4,
    created_at: "2024-01-14T16:00:00Z",
  },
];

export const mockSortedActivities: Activity[] = [...mockActivities].sort(
  (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
);

export const createMockActivity = (
  overrides: Partial<Activity> = {}
): Activity => ({
  id: `activity-${Date.now()}`,
  type: "reading" as const,
  user_id: `friend-${Date.now()}`,
  user_name: "Test User",
  avatar_url: null,
  book_id: `book-${Date.now()}`,
  book_title: "Test Book",
  created_at: new Date().toISOString(),
  ...overrides,
});
