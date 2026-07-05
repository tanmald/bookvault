export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      book_files: {
        Row: {
          book_id: string
          created_at: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          language: string
        }
        Insert: {
          book_id: string
          created_at?: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          language?: string
        }
        Update: {
          book_id?: string
          created_at?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          language?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_files_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_tags: {
        Row: {
          book_id: string
          created_at: string
          id: string
          tag_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          tag_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_tags_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          file_size: number | null
          file_type: string
          file_url: string
          genre_id: string | null
          id: string
          isbn: string | null
          library_id: string
          owner_id: string
          title: string
          updated_at: string
          year: number | null
        }
        Insert: {
          author?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          file_size?: number | null
          file_type: string
          file_url: string
          genre_id?: string | null
          id?: string
          isbn?: string | null
          library_id: string
          owner_id: string
          title: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          author?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          file_size?: number | null
          file_type?: string
          file_url?: string
          genre_id?: string | null
          id?: string
          isbn?: string | null
          library_id?: string
          owner_id?: string
          title?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "books_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_books_library"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_books: {
        Row: {
          author: string
          cover_url: string | null
          created_at: string
          description: string | null
          file_size: number | null
          file_type: string
          file_url: string
          genre_slug: string | null
          id: string
          is_active: boolean | null
          language: string | null
          title: string
          year: number | null
        }
        Insert: {
          author: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          file_size?: number | null
          file_type: string
          file_url: string
          genre_slug?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          title: string
          year?: number | null
        }
        Update: {
          author?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          file_size?: number | null
          file_type?: string
          file_url?: string
          genre_slug?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          title?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "demo_books_genre_slug_fkey"
            columns: ["genre_slug"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["slug"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          invite_link_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          invite_link_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          invite_link_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_invite_link_id_fkey"
            columns: ["invite_link_id"]
            isOneToOne: false
            referencedRelation: "invite_links"
            referencedColumns: ["id"]
          },
        ]
      }
      genres: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      invite_links: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          library_id: string
          max_uses: number | null
          owner_id: string
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          library_id: string
          max_uses?: number | null
          owner_id: string
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          library_id?: string
          max_uses?: number | null
          owner_id?: string
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_invite_links_library"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_links_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      libraries: {
        Row: {
          allow_member_uploads: boolean
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_default: boolean
          is_public: boolean
          name: string
          updated_at: string
        }
        Insert: {
          allow_member_uploads?: boolean
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_default?: boolean
          is_public?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          allow_member_uploads?: boolean
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_default?: boolean
          is_public?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      library_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          library_id: string
          role: Database["public"]["Enums"]["library_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          library_id: string
          role?: Database["public"]["Enums"]["library_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          library_id?: string
          role?: Database["public"]["Enums"]["library_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_library_members_library"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          demo_book_created: boolean
          display_name: string | null
          has_completed_onboarding: boolean
          id: string
          kanban_size: string
          onboarding_completed_at: string | null
          onboarding_step: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          demo_book_created?: boolean
          display_name?: string | null
          has_completed_onboarding?: boolean
          id?: string
          kanban_size?: string
          onboarding_completed_at?: string | null
          onboarding_step?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          demo_book_created?: boolean
          display_name?: string | null
          has_completed_onboarding?: boolean
          id?: string
          kanban_size?: string
          onboarding_completed_at?: string | null
          onboarding_step?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reading_progress: {
        Row: {
          book_id: string
          created_at: string
          finished_at: string | null
          id: string
          progress: number
          sort_order: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["reading_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          finished_at?: string | null
          id?: string
          progress?: number
          sort_order?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["reading_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          finished_at?: string | null
          id?: string
          progress?: number
          sort_order?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["reading_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_progress_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          book_id: string
          content: string | null
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          content?: string | null
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          content?: string | null
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_friends: { Args: { user1: string; user2: string }; Returns: boolean }
      debug_user_access: {
        Args: never
        Returns: {
          auth_uid: string
          book_count: number
          library_count: number
          membership_count: number
          user_id: string
        }[]
      }
      get_friends_with_profiles: {
        Args: { p_user_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          friend_user_id: string
          friendship_created_at: string
          friendship_id: string
        }[]
      }
      get_invite_link_info: {
        Args: { p_code: string }
        Returns: {
          valid: boolean
          owner_display_name: string | null
          expired: boolean
          max_uses_reached: boolean
        }[]
      }
      get_library_friends_book_progress: {
        Args: { p_book_id: string; p_user_id: string }
        Returns: {
          avatar_url: string | null
          display_name: string | null
          finished_at: string | null
          friend_id: string
          progress: number
          review_id: string | null
          review_rating: number | null
          review_text: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["reading_status"]
        }[]
      }
      get_library_members_with_profiles: {
        Args: { p_library_id: string }
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          role: Database["public"]["Enums"]["library_role"]
          user_id: string
        }[]
      }
      get_user_libraries: {
        Args: never
        Returns: {
          allow_member_uploads: boolean
          created_at: string
          created_by: string
          description: string
          id: string
          is_default: boolean
          is_public: boolean
          name: string
          updated_at: string
        }[]
      }
      has_library_role: {
        Args: {
          _library_owner_id: string
          _role: Database["public"]["Enums"]["library_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_library_admin: {
        Args: { _library_id: string; _user_id: string }
        Returns: boolean
      }
      use_invite_link: {
        Args: { invite_code: string; joining_user_id: string }
        Returns: {
          error_message: string
          invite_id: string
          library_id: string
          success: boolean
        }[]
      }
    }
    Enums: {
      library_role: "admin" | "member"
      reading_status: "to_read" | "reading" | "read" | "not_planned"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      library_role: ["admin", "member"],
      reading_status: ["to_read", "reading", "read", "not_planned"],
    },
  },
} as const
