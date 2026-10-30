// Explicit local demonstration, isolated from the real RPC transport.
import { randomUUID } from 'node:crypto';
export function atelierFixtures(ownerId, social, studio, createOutfit) {
  const collections = [],
    designs = [];
  const photo = (id) => social.handle('social_query', { p_query: { kind: 'detail', id } });
  return {
    handle(a) {
      if (a.action === 'list')
        return {
          collections: a.ownerId
            ? collections.filter((c) => c.featured && c.ownerId === a.ownerId)
            : collections,
          designs: a.ownerId ? [] : designs,
        };
      if (a.action === 'create_collection') {
        const c = {
          id: randomUUID(),
          ownerId,
          title: a.title,
          note: '',
          event: '',
          featured: false,
          coverId: null,
          revision: 1,
          permission: 'owner',
          entries: [],
          members: [],
          comments: [],
        };
        collections.unshift(c);
        return c;
      }
      if (a.action === 'save_design') {
        for (const l of a.design.layers) {
          if (l.kind === 'wish' && !studio().evolution.wishes.some((w) => w.id === l.target))
            throw new Error('Desejo indisponível.');
          if (l.kind === 'item' && !studio().items.some((i) => i.id === l.target && !i.archived_at))
            throw new Error('Peça indisponível.');
        }
        const old = designs.find((d) => d.id === a.id);
        if (old && (old.outfitId || old.revision !== a.design.revision))
          throw new Error('Este rascunho mudou. Atualize.');
        const d = {
          ...a.design,
          id: a.id,
          revision: (old?.revision || 0) + 1,
          updatedAt: new Date().toISOString(),
        };
        if (old) designs.splice(designs.indexOf(old), 1);
        designs.unshift(d);
        return d;
      }
      if (a.action === 'save_outfit') {
        const d = designs.find((d) => d.id === a.id);
        if (!d) throw new Error('Indisponível');
        if (!d.outfitId) {
          d.outfitId = createOutfit(
            [...new Set(d.layers.filter((l) => l.kind === 'item').map((l) => l.target))],
            d.title,
          );
          d.revision++;
        }
        return d;
      }
      if (a.action === 'delete_design') {
        const i = designs.findIndex((d) => d.id === a.id);
        if (i >= 0) designs.splice(i, 1);
        return null;
      }
      const c = collections.find((c) => c.id === a.id);
      if (!c) throw new Error('Coleção indisponível.');
      if (a.revision && a.revision !== c.revision) throw new Error('Esta coleção mudou. Atualize.');
      if (a.action === 'delete_collection') {
        collections.splice(collections.indexOf(c), 1);
        return null;
      }
      if (a.action === 'save_collection')
        Object.assign(c, { title: a.title, note: a.note, event: a.event });
      if (a.action === 'add_entry' && !c.entries.some((e) => e.publication.id === a.publicationId))
        c.entries.push({ publication: photo(a.publicationId), note: '' });
      if (a.action === 'remove_entry')
        c.entries = c.entries.filter((e) => e.publication.id !== a.publicationId);
      if (a.action === 'entry_note')
        c.entries.find((e) => e.publication.id === a.publicationId).note = a.note;
      if (a.action === 'cover') c.coverId = a.publicationId;
      if (a.action === 'order_entries')
        c.entries.sort((x, y) => a.ids.indexOf(x.publication.id) - a.ids.indexOf(y.publication.id));
      if (a.action === 'feature') c.featured = a.active;
      if (a.action === 'grant') {
        const author = social
          .handle('social_query', { p_query: { kind: 'friends' } })
          .find((f) => f.id === a.userId);
        if (!author) throw new Error('Amizade indisponível');
        c.members = [
          ...c.members.filter((m) => m.author.id !== a.userId),
          { author, role: a.role },
        ];
      }
      if (a.action === 'revoke') c.members = c.members.filter((m) => m.author.id !== a.userId);
      if (a.action === 'comment')
        c.comments.push({
          id: randomUUID(),
          author: { id: ownerId, username: 'pedro.carvalho' },
          body: a.body,
          createdAt: new Date().toISOString(),
        });
      if (a.action === 'delete_comment')
        c.comments = c.comments.filter((m) => m.id !== a.commentId);
      if (a.action !== 'get_collection') c.revision++;
      return c;
    },
  };
}
