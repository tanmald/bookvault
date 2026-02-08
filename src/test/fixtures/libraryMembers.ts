import { LibraryMember } from "@/hooks/useLibraryMembers";

export const mockLibraryMembers: LibraryMember[] = [
  {
    user_id: "owner-user-id",
    display_name: "Library Owner",
    avatar_url: null,
    role: "admin",
    created_at: "2024-01-01T00:00:00Z",
    is_owner: true,
  },
  {
    user_id: "admin-user-id",
    display_name: "Admin User",
    avatar_url: "https://example.com/avatar1.jpg",
    role: "admin",
    created_at: "2024-01-02T00:00:00Z",
    is_owner: false,
  },
  {
    user_id: "member-user-id",
    display_name: "Regular Member",
    avatar_url: null,
    role: "member",
    created_at: "2024-01-03T00:00:00Z",
    is_owner: false,
  },
  {
    user_id: "user-with-not-planned",
    display_name: "Not Planned User",
    avatar_url: null,
    role: "member",
    created_at: "2024-01-04T00:00:00Z",
    is_owner: false,
  },
];

export const mockLibraryMembersWithProgress = [
  {
    ...mockLibraryMembers[0],
    progress: {
      status: "read" as const,
      progress: 100,
      started_at: "2024-01-01T00:00:00Z",
      finished_at: "2024-01-05T00:00:00Z",
    },
  },
  {
    ...mockLibraryMembers[1],
    progress: {
      status: "reading" as const,
      progress: 75,
      started_at: "2024-01-10T00:00:00Z",
      finished_at: null,
    },
  },
  {
    ...mockLibraryMembers[2],
    progress: {
      status: "to_read" as const,
      progress: 0,
      started_at: null,
      finished_at: null,
    },
  },
  {
    ...mockLibraryMembers[3],
    progress: {
      status: "not_planned" as const,
      progress: 0,
      started_at: null,
      finished_at: null,
    },
  },
];

export const createMockLibraryMember = (
  overrides: Partial<LibraryMember> = {}
): LibraryMember => ({
  user_id: `user-${Date.now()}`,
  display_name: "Test User",
  avatar_url: null,
  role: "member",
  created_at: new Date().toISOString(),
  is_owner: false,
  ...overrides,
});
