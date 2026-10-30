import palette from '@/design/palette.json';
export type ProfileTone = 'olive' | 'clay' | 'lemon';
export type IdentityProfile = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  bio: string;
  avatarPath: string | null;
  bannerPath?: string | null;
  tone: ProfileTone;
  tags: string[];
  discoverable: boolean;
  usernameChangedAt: string;
  usernameAvailableAt: string;
  createdAt: string;
};
export type ProfileDraft = Pick<
  IdentityProfile,
  'username' | 'firstName' | 'lastName' | 'bio' | 'tone' | 'tags' | 'discoverable'
>;
export type ProfileCounts = { following: number; followers: number; posts: number };
export type KnownDevice = {
  id: string;
  label: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  current: boolean;
};
export type AccountData = {
  profile: IdentityProfile | null;
  counts: ProfileCounts;
  devices: KnownDevice[];
};
export type ProfileCard = {
  profile: IdentityProfile;
  counts: ProfileCounts;
  following: boolean;
  self: boolean;
};
export type Connection = Pick<
  IdentityProfile,
  'id' | 'username' | 'firstName' | 'lastName' | 'avatarPath' | 'tone'
>;
export type DeviceCredential = { id: string; secret: string };
export type SessionCheck = { verified: boolean; account: AccountData | null };
export const profileTones: Record<
  ProfileTone,
  { label: string; background: string; ink: string; detail: string; detailInk: string }
> = {
  olive: {
    label: 'Verde',
    background: palette.accent,
    ink: palette.paper,
    detail: palette.lemon,
    detailInk: palette.ink,
  },
  clay: {
    label: 'Coral',
    background: palette.coral,
    ink: palette.ink,
    detail: palette.ink,
    detailInk: palette.paper,
  },
  lemon: {
    label: 'Lima',
    background: palette.lemon,
    ink: palette.ink,
    detail: palette.accent,
    detailInk: palette.paper,
  },
};
