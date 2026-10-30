// Explicit schema types. Regeneration instructions are in README.md.
import type { Item, OutfitRow, WearLog, Post } from './domain';
type Relation = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};
type Table<Row, Insert, Update = never, Relationships extends Relation[] = []> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationships;
};
export type Database = {
  public: {
    Tables: {
      wardrobe_items: Table<
        Item,
        Omit<Item, 'id' | 'created_at' | 'archived_at'> & { id?: string },
        Partial<
          Pick<
            Item,
            'name' | 'category' | 'color' | 'size' | 'fit' | 'brand' | 'photo_path' | 'archived_at'
          >
        >
      >;
      outfits: Table<OutfitRow, never>;
      outfit_items: Table<
        { outfit_id: string; item_id: string },
        never,
        never,
        [
          {
            foreignKeyName: 'outfit_items_outfit_id_fkey';
            columns: ['outfit_id'];
            isOneToOne: false;
            referencedRelation: 'outfits';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'outfit_items_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'wardrobe_items';
            referencedColumns: ['id'];
          },
        ]
      >;
      wear_log: Table<
        WearLog,
        Omit<WearLog, 'id' | 'created_at'> & { id?: string },
        never,
        [
          {
            foreignKeyName: 'wear_log_outfit_id_fkey';
            columns: ['outfit_id'];
            isOneToOne: false;
            referencedRelation: 'outfits';
            referencedColumns: ['id'];
          },
        ]
      >;
      posts: Table<
        Post,
        Omit<Post, 'id' | 'created_at'> & { id?: string },
        never,
        [
          {
            foreignKeyName: 'posts_outfit_id_fkey';
            columns: ['outfit_id'];
            isOneToOne: false;
            referencedRelation: 'outfits';
            referencedColumns: ['id'];
          },
        ]
      >;
    };
    Views: {
      item_last_worn: {
        Row: { item_id: string; last_worn_date: string | null };
        Relationships: [];
      };
      outfit_last_worn: {
        Row: { outfit_id: string; last_worn_date: string | null };
        Relationships: [];
      };
    };
    Functions: {
      identity_session: {
        Args: { p_device_id: string; p_secret: string; p_label: string };
        Returns: import('../identity/types').SessionCheck;
      };
      identity_account: {
        Args: Record<string, never>;
        Returns: import('../identity/types').AccountData;
      };
      identity_revoke_device: { Args: { p_id: string }; Returns: undefined };
      profile_username_available: { Args: { p_username: string }; Returns: boolean };
      profile_save: {
        Args: { p_profile: import('../identity/types').ProfileDraft };
        Returns: import('../identity/types').AccountData;
      };
      profile_set_avatar: {
        Args: { p_path: string | null };
        Returns: import('../identity/types').AccountData;
      };
      profile_lookup: {
        Args: { p_username: string };
        Returns: import('../identity/types').ProfileCard | null;
      };
      profile_connections: {
        Args: { p_kind: string; p_offset: number };
        Returns: import('../identity/types').Connection[];
      };
      profile_connect: {
        Args: { p_target: string; p_action: string };
        Returns: import('../identity/types').AccountData;
      };
      circles_snapshot: {
        Args: Record<string, never>;
        Returns: import('../evolution/social').CircleData;
      };
      circle_action: {
        Args: { p_action: import('../evolution/social').CircleAction };
        Returns: import('../evolution/social').CircleData;
      };
      closet_snapshot: {
        Args: Record<string, never>;
        Returns: import('../preview/types').StudioData;
      };
      closet_apply: {
        Args: { p_action: import('../preview/types').StudioAction };
        Returns: import('../preview/types').StudioData;
      };
      create_outfit: {
        Args: { p_item_ids: string[]; p_name?: string | null; p_photo_path?: string | null };
        Returns: string;
      };
    };
    Enums: { item_category: Item['category']; item_fit: NonNullable<Item['fit']> };
    CompositeTypes: Record<string, never>;
  };
};
