// Demo-only social service. Never imported by a production app bundle.
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
const catalog = JSON.parse(
  readFileSync(new URL('../src/social/catalog-data.json', import.meta.url), 'utf8'),
);
const normalize = (value) =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
export function socialFixtures(owner, identity, photos) {
  const marks = new Map();
  const notes = new Map();
  const shares = [];
  const author = (id) => identity.profiles.get(id);
  const marina = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const ian = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const legacy = JSON.parse(
    readFileSync(new URL('../src/social/catalog-legacy.json', import.meta.url), 'utf8'),
  );
  const curated = catalog.map((row, i) => ({
    id: row.id,
    title: row.title,
    caption: '',
    tags: row.tags,
    colors: row.colors,
    width: row.width,
    height: row.height,
    fullPath: `seed/${row.key}/full.jpg`,
    thumbPath: `seed/${row.key}/thumb.jpg`,
    createdAt: `2026-10-01T12:${String(59 - i).padStart(2, '0')}:00.000Z`,
    author: null,
    curated: true,
    credit: row.credit,
    sourceUrl: row.evidenceUrl || row.sourceUrl,
  }));
  const posts = [...curated];
  for (let i = 0; i < 18; i++) {
    const row = legacy[i % legacy.length];
    const who = [marina, ian, owner][i % 3];
    const root = `${who}/33333333-3333-4333-8333-${String(i + 1).padStart(12, '0')}`;
    photos.set(`${root}/full.jpg`, { muralFile: `${row.key}-full.jpg` });
    photos.set(`${root}/thumb.jpg`, { muralFile: `${row.key}-thumb.jpg` });
    posts.push({
      ...curated[i % catalog.length],
      width: row.width,
      height: row.height,
      tags: row.tags,
      colors: row.colors,
      id: `33333333-3333-4333-8333-${String(i + 1).padStart(12, '0')}`,
      title:
        [
          `Cor na rua`,
          `Camadas e textura`,
          `Meu jeito de combinar`,
          `Jeans e movimento`,
          `Um detalhe muda tudo`,
          `Neutros com atitude`,
        ][i % 6] + (i >= 6 ? ` · ${i + 1}` : ''),
      caption: 'Exemplo fictício da prévia. Foto de referência do Unsplash.',
      author: author(who),
      curated: false,
      fullPath: `${root}/full.jpg`,
      thumbPath: `${root}/thumb.jpg`,
      createdAt: new Date(Date.UTC(2026, 9, 14, 12, 59 - i)).toISOString(),
      credit: row.credit,
      sourceUrl: null,
    });
  }
  const has = (id, kind, user = owner) => marks.has(`${user}:${id}:${kind}`);
  const visible = (p) => p.curated || identity.isVisible(p.author?.id);
  const json = (p) => ({
    ...p,
    author: p.author ? author(p.author.id) : null,
    mine: p.author?.id === owner,
    friend: !!p.author && identity.isFriend(p.author.id),
    liked: has(p.id, 'like'),
    saved: has(p.id, 'save'),
    reposted: has(p.id, 'repost'),
    likes: [...marks.keys()].filter((k) => k.endsWith(`:${p.id}:like`)).length,
    reposts: [...marks.keys()].filter((k) => k.endsWith(`:${p.id}:repost`)).length,
    reposters: [owner, marina, ian]
      .filter(
        (id) =>
          has(p.id, 'repost', id) &&
          (id === owner || identity.isFriend(id)) &&
          identity.isVisible(id),
      )
      .map(author),
  });
  marks.set(`${marina}:${curated[0].id}:repost`, new Date(Date.UTC(2026, 9, 14, 13)).toISOString());
  marks.set(`${owner}:${posts[curated.length].id}:save`, new Date().toISOString());
  shares.push({
    id: randomUUID(),
    sender: author(marina),
    recipient: owner,
    publicationId: posts[curated.length + 1].id,
    createdAt: new Date().toISOString(),
    read: false,
  });
  return {
    posts,
    handle(name, args = {}) {
      if (name === 'social_notebook') {
        const q = args.p_action || {};
        if (q.kind === 'save') notes.set(q.id, q.note.trim());
        return notes.get(q.id) || '';
      }
      if (name === 'social_query') {
        const q = args.p_query || {};
        if (q.kind === 'detail') {
          const p = posts.find((p) => p.id === q.id);
          return p && visible(p) ? json(p) : null;
        }
        if (q.kind === 'friends')
          return [...identity.profiles.values()]
            .filter((p) => identity.isFriend(p.id) && identity.isVisible(p.id))
            .slice(q.offset || 0, (q.offset || 0) + 30);
        if (q.kind === 'inbox')
          return shares
            .filter((s) => s.recipient === owner && identity.isFriend(s.sender.id))
            .map((s) => ({ ...s, publication: posts.find((p) => p.id === s.publicationId) }))
            .filter((s) => s.publication && visible(s.publication))
            .filter((s) => !q.cursor || `${s.createdAt}:${s.id}` < `${q.cursor.at}:${q.cursor.id}`)
            .sort((a, b) => `${b.createdAt}:${b.id}`.localeCompare(`${a.createdAt}:${a.id}`))
            .slice(0, 30)
            .map((s) => ({ ...s, publication: json(s.publication) }));
        const rank = (p) =>
          [
            p.createdAt,
            ...[owner, marina, ian]
              .filter((u) => u === owner || identity.isFriend(u))
              .map((u) => marks.get(`${u}:${p.id}:repost`) || ''),
          ]
            .sort()
            .at(-1);
        const rows = posts
          .filter(visible)
          .filter((p) => !has(p.id, 'hide'))
          .filter(
            (p) =>
              !q.author ||
              (q.mode === 'reposts' ? has(p.id, 'repost', q.author) : p.author?.id === q.author),
          )
          .filter(
            (p) =>
              !q.mode ||
              q.mode === 'all' ||
              (q.mode === 'mine' && p.author?.id === owner) ||
              (q.mode === 'friends' &&
                (identity.isFriend(p.author?.id) ||
                  json(p).reposters.some((a) => identity.isFriend(a.id)))) ||
              (q.mode === 'saved' && has(p.id, 'save')) ||
              (q.mode === 'reposts' && (q.author || has(p.id, 'repost'))),
          )
          .filter((p) => !q.color || p.colors.includes(q.color))
          .filter(
            (p) =>
              !q.search ||
              normalize(
                `${p.title} ${p.caption} ${p.tags.join(' ')} ${p.colors.join(' ')}`,
              ).includes(normalize(q.search)),
          )
          .sort((a, b) => `${rank(b)}:${b.id}`.localeCompare(`${rank(a)}:${a.id}`))
          .filter((p) => !q.cursor || `${rank(p)}:${p.id}` < `${q.cursor.at}:${q.cursor.id}`);
        const batch = rows.slice(0, 12);
        return {
          items: batch.map(json),
          next: rows.length > 12 ? { at: rank(batch.at(-1)), id: batch.at(-1).id } : null,
        };
      }
      const a = args.p_action || {};
      if (a.action === 'publish') {
        if (!author(owner)?.discoverable) throw new Error('PUBLIC_PROFILE_REQUIRED');
        if (!photos.has(a.fullPath) || !photos.has(a.thumbPath))
          throw new Error('MEDIA_NOT_UPLOADED');
        const exists = posts.find((p) => p.fullPath === a.fullPath);
        if (exists) return json(exists);
        const p = {
          ...a,
          id: randomUUID(),
          author: author(owner),
          createdAt: new Date().toISOString(),
          curated: false,
          credit: '',
          sourceUrl: null,
        };
        posts.unshift(p);
        return json(p);
      }
      if (a.action === 'read') {
        const share = shares.find((s) => s.id === a.id && s.recipient === owner);
        if (share) share.read = true;
        return null;
      }
      const p = posts.find((p) => p.id === a.id);
      if (!p || !visible(p)) throw new Error('PUBLICATION_UNAVAILABLE');
      if (a.action === 'delete') {
        if (p.author?.id !== owner) throw new Error('NOT_OWNER');
        posts.splice(posts.indexOf(p), 1);
        return null;
      }
      if (['like', 'save', 'repost', 'hide'].includes(a.action)) {
        if (typeof a.active !== 'boolean') throw new Error('INVALID_ACTION');
        if (a.action === 'repost' && a.active && !author(owner).discoverable)
          throw new Error('PUBLIC_PROFILE_REQUIRED');
        const key = `${owner}:${p.id}:${a.action}`;
        if (a.active) {
          if (!marks.has(key)) marks.set(key, new Date().toISOString());
        } else marks.delete(key);
        return json(p);
      }
      if (a.action === 'report') {
        marks.set(`${owner}:${p.id}:hide`, new Date().toISOString());
        return null;
      }
      if (a.action === 'share') {
        if (!identity.isFriend(a.recipient) || !identity.isVisible(a.recipient))
          throw new Error('FRIEND_REQUIRED');
        if (
          !shares.some(
            (s) => s.sender.id === owner && s.recipient === a.recipient && s.publicationId === p.id,
          )
        )
          shares.push({
            id: randomUUID(),
            sender: author(owner),
            recipient: a.recipient,
            publicationId: p.id,
            createdAt: new Date().toISOString(),
            read: false,
          });
        return { sent: true };
      }
      throw new Error('INVALID_ACTION');
    },
  };
}
