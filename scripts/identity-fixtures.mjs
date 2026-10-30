// Explicitly isolated example identity service. The six-digit test code exists only here.
import { randomUUID } from 'node:crypto';
import { normalizeProfile, usernameError } from '../src/identity/validation.ts';
export function identityFixtures(
  owner,
  studio,
  { needsVerification = false, socialFriends = false, showcaseAccount = false } = {},
) {
  const profiles = new Map();
  const following = new Set();
  const blocked = new Set();
  const devices = new Map();
  let currentDevice;
  let otp = false;
  const make = (id, username, firstName, lastName, tone, tags) => ({
    id,
    username,
    firstName,
    lastName,
    tone,
    tags,
    bio: 'Novas possibilidades nas roupas que já tenho.',
    avatarPath: null,
    discoverable: true,
    usernameChangedAt: new Date().toISOString(),
    usernameAvailableAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  });
  profiles.set(
    owner,
    showcaseAccount
      ? make(owner, 'oarmandopintoofc', 'Armando', 'Pinto', 'olive', ['Urbano', 'Textura'])
      : make(owner, 'lia.oliveira', 'Lia', 'Oliveira', 'olive', ['Conforto', 'Textura']),
  );
  const friend = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    follower = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  profiles.set(friend, make(friend, 'marina.ramos', 'Marina', 'Ramos', 'clay', ['Vintage', 'Cor']));
  profiles.set(
    follower,
    make(follower, 'ian.costa', 'Ian', 'Costa', 'lemon', ['Urbano', 'Minimal']),
  );
  following.add(`${owner}:${friend}`);
  following.add(`${follower}:${owner}`);
  if (socialFriends) following.add(`${friend}:${owner}`);
  const counts = (id) => ({
    following: [...following].filter((v) => v.startsWith(id + ':')).length,
    followers: [...following].filter((v) => v.endsWith(':' + id)).length,
    posts: studio().socialPosts?.filter((p) => p.author?.id === id).length || 0,
  });
  const account = () => ({
    profile: profiles.get(owner) || null,
    counts: counts(owner),
    devices: [...devices.values()].map(({ secret, ...device }) => ({
      ...device,
      current: device.id === currentDevice,
    })),
  });
  function handle(name, args = {}) {
    if (name === 'profile_username_available')
      return (
        !usernameError(args.p_username) &&
        ![...profiles.values()].some((p) => p.id !== owner && p.username === args.p_username)
      );
    if (name === 'identity_session') {
      currentDevice = args.p_device_id;
      const device = devices.get(currentDevice);
      if (needsVerification && !otp && (!device || device.secret !== args.p_secret))
        return { verified: false, account: null };
      devices.set(currentDevice, {
        id: currentDevice,
        label: args.p_label,
        secret: args.p_secret,
        createdAt: device?.createdAt || new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 90 * 86400000).toISOString(),
      });
      otp = false;
      return { verified: true, account: account() };
    }
    if (name === 'identity_account') return account();
    if (name === 'identity_revoke_device') {
      devices.delete(args.p_id);
      needsVerification = true;
      return null;
    }
    if (name === 'profile_save') {
      const value = normalizeProfile(args.p_profile),
        previous = profiles.get(owner);
      if (
        previous &&
        previous.username !== value.username &&
        Date.now() < new Date(previous.usernameAvailableAt).getTime()
      )
        throw new Error('USERNAME_COOLDOWN');
      if (!handle('profile_username_available', { p_username: value.username }))
        throw new Error('USERNAME_UNAVAILABLE');
      profiles.set(owner, {
        ...(previous ||
          make(owner, value.username, value.firstName, value.lastName, value.tone, value.tags)),
        ...value,
      });
      return account();
    }
    if (name === 'profile_set_banner') {
      profiles.get(owner).bannerPath = args.p_path;
      return account();
    }
    if (name === 'profile_set_avatar') {
      profiles.get(owner).avatarPath = args.p_path;
      return account();
    }
    if (name === 'profile_lookup') {
      const p = [...profiles.values()].find((p) => p.username === args.p_username);
      if (!p || (!p.discoverable && p.id !== owner) || blocked.has(p.id)) return null;
      return {
        profile: p,
        counts: counts(p.id),
        following: following.has(`${owner}:${p.id}`),
        self: p.id === owner,
      };
    }
    if (name === 'profile_connect') {
      const target = args.p_target;
      if (target === owner) throw new Error('INVALID_CONNECTION');
      if (args.p_action === 'follow') following.add(`${owner}:${target}`);
      if (args.p_action === 'unfollow') following.delete(`${owner}:${target}`);
      if (args.p_action === 'remove_follower') following.delete(`${target}:${owner}`);
      if (args.p_action === 'block') {
        blocked.add(target);
        following.delete(`${owner}:${target}`);
        following.delete(`${target}:${owner}`);
      }
      if (args.p_action === 'unblock') blocked.delete(target);
      return account();
    }
    if (name === 'profile_connections')
      return [...profiles.values()]
        .filter((p) =>
          args.p_kind === 'blocked'
            ? blocked.has(p.id)
            : !blocked.has(p.id) &&
              following.has(args.p_kind === 'following' ? `${owner}:${p.id}` : `${p.id}:${owner}`),
        )
        .sort((a, b) => a.username.localeCompare(b.username))
        .slice(args.p_offset || 0, (args.p_offset || 0) + 30);
    throw new Error('Unknown identity action');
  }
  return {
    profiles,
    isVisible: (id) => id === owner || (!!profiles.get(id)?.discoverable && !blocked.has(id)),
    isFriend: (id) =>
      !blocked.has(id) && following.has(`${owner}:${id}`) && following.has(`${id}:${owner}`),
    handle,
    beginSignup: () => {
      profiles.delete(owner);
      for (const edge of following) if (edge.includes(owner)) following.delete(edge);
      needsVerification = true;
      devices.clear();
    },
    verify: (token) => {
      if (token !== '123456') throw new Error('otp_expired');
      otp = true;
      return randomUUID();
    },
  };
}
