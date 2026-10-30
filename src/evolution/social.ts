import type { RecipeSlot } from './types';
export type CircleMessage = {
  id: string;
  userId: string;
  kind: 'request' | 'comment' | 'recipe' | 'poll';
  body: string;
  cards: { title: string; slots: RecipeSlot[] }[];
  parentId: string | null;
  createdAt: string;
  votes: { userId: string; choice: number }[];
};
export type Circle = {
  id: string;
  title: string;
  ownerId: string;
  members: { id: string; name: string }[];
  messages: CircleMessage[];
};
export type CircleData = { circles: Circle[]; invite?: string };
export type CircleAction =
  | { action: 'create'; title: string; name: string }
  | { action: 'join'; token: string; name: string }
  | { action: 'invite' | 'revoke_invite' | 'leave' | 'delete_circle'; circleId: string }
  | { action: 'remove_member'; circleId: string; userId: string }
  | {
      action: 'message';
      circleId: string;
      kind: CircleMessage['kind'];
      body: string;
      outfitIds: string[];
      parentId: string | null;
    }
  | { action: 'delete_message'; circleId: string; messageId: string }
  | { action: 'vote'; circleId: string; messageId: string; choice: number };
