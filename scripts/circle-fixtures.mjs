import { randomUUID } from 'node:crypto';
import { roleOf } from '../src/evolution/core.ts';
export function circleFixtures(userId, studio) {
  const circles = [];
  const invites = new Map();
  return (action) => {
    if (!action) return { circles };
    let invite;
    if (action.action === 'create') {
      if (
        !action.title?.trim() ||
        !action.name?.trim() ||
        action.title.length > 80 ||
        action.name.length > 80
      )
        throw new Error('Informe seu nome e o nome do círculo.');
      circles.push({
        id: randomUUID(),
        title: action.title.trim(),
        ownerId: userId,
        members: [{ id: userId, name: action.name.trim() }],
        messages: [],
      });
    } else if (action.action === 'join') {
      const cid = invites.get(action.token),
        circle = circles.find((c) => c.id === cid);
      if (!circle) throw new Error('Convite não encontrado ou expirado.');
      if (circle.members.some((m) => m.id === userId))
        throw new Error('Você já participa deste círculo.');
    } else {
      const c = circles.find((c) => c.id === action.circleId);
      if (!c) throw new Error('Círculo não encontrado.');
      if (action.action === 'invite') {
        for (const [token, id] of invites) if (id === c.id) invites.delete(token);
        invite = randomUUID();
        invites.set(invite, c.id);
      } else if (action.action === 'revoke_invite') {
        for (const [token, id] of invites) if (id === c.id) invites.delete(token);
      } else if (action.action === 'delete_circle') circles.splice(circles.indexOf(c), 1);
      else if (action.action === 'message') {
        if (
          !['request', 'comment', 'recipe', 'poll'].includes(action.kind) ||
          !action.body?.trim() ||
          action.body.length > 500
        )
          throw new Error('Escreva uma mensagem de até 500 caracteres.');
        if (action.parentId && !c.messages.some((m) => m.id === action.parentId))
          throw new Error('Mensagem original não encontrada.');
        const data = studio();
        let cards = [];
        if (['recipe', 'poll'].includes(action.kind)) {
          if (
            action.outfitIds.length !== (action.kind === 'poll' ? 2 : 1) ||
            new Set(action.outfitIds).size !== action.outfitIds.length
          )
            throw new Error('Escolha as combinações.');
          cards = action.outfitIds.map((id) => {
            const o = data.outfits.find((o) => o.id === id);
            if (!o) throw new Error('Look não encontrado.');
            return {
              title: o.name || 'Meu look',
              slots: o.items.map((i) => ({
                role: roleOf(i.category),
                category: i.category,
                color: i.color,
              })),
            };
          });
        }
        c.messages.unshift({
          id: randomUUID(),
          userId,
          kind: action.kind,
          body: action.body.trim(),
          cards,
          parentId: action.parentId || null,
          createdAt: new Date().toISOString(),
          votes: [],
        });
      } else if (action.action === 'delete_message') {
        c.messages = c.messages.filter(
          (m) => m.id !== action.messageId && m.parentId !== action.messageId,
        );
      } else if (action.action === 'vote') {
        const m = c.messages.find((m) => m.id === action.messageId);
        if (!m || m.kind !== 'poll' || ![0, 1].includes(action.choice))
          throw new Error('Enquete não encontrada.');
        m.votes = m.votes.filter((v) => v.userId !== userId);
        m.votes.push({ userId, choice: action.choice });
      } else throw new Error('Ação indisponível nesta prévia.');
    }
    return { circles, ...(invite ? { invite } : {}) };
  };
}
