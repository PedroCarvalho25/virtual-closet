// Explicit demo data for the local design preview. Never imported by the app.
import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { applyEvolution } from '../src/evolution/core.ts';
import { emptyDetail, freshEvolution } from '../src/evolution/types.ts';
import { circleFixtures } from './circle-fixtures.mjs';
import { atelierFixtures } from './atelier-fixtures.mjs';
import { socialFixtures } from './social-fixtures.mjs';
import { identityFixtures } from './identity-fixtures.mjs';
export const demoUserId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const uid = (n) => `11111111-1111-4111-8111-${String(n).padStart(12, '0')}`;
export const demoUser = {
  id: demoUserId,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'exemplo@closet.local',
  app_metadata: { provider: 'email' },
  user_metadata: {},
  created_at: new Date().toISOString(),
};
export function demoSession(method = 'password') {
  return {
    access_token: `${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: demoUserId, role: 'authenticated', session_id: randomUUID(), amr: [{ method, timestamp: Math.floor(Date.now() / 1000) }], exp: Math.floor(Date.now() / 1000) + 86400 })).toString('base64url')}.preview`,
    token_type: 'bearer',
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    refresh_token: 'preview-only',
    user: demoUser,
  };
}
export function createPreviewData({
  showcase = false,
  empty = false,
  needsVerification = false,
  socialFriends = false,
  showcaseAccount = false,
} = {}) {
  const authUser = { ...demoUser, user_metadata: {} };
  const sessionFor = (method = 'password') => ({ ...demoSession(method), user: authUser });
  const date = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const photos = new Map();
  const items = [
    ['Camiseta essencial', 'camiseta', 'Branco', 'M', 'tee'],
    ['Tricô de domingo', 'outro', 'Areia', 'M', 'knit'],
    ['Jeans favoritos', 'calca', 'Azul', '40', 'denim'],
    ['Tênis caramelo', 'tenis', 'Caramelo', '40 BR', 'sneakers'],
    ['Camisa clássica', 'camisa', 'Branco', 'M', 'shirt'],
    ['Boné de fim de semana', 'bone_aba_curta', 'Branco', 'Único', 'cap'],
    ['Shorts jeans', 'jorts', 'Azul', '40', 'shorts'],
  ].map(([name, category, color, size, image], i) => {
    const id = uid(i + 1);
    const path = `${demoUserId}/items/${id}.jpg`;
    photos.set(path, { file: `${image}.jpg` });
    return {
      id,
      user_id: demoUserId,
      name,
      category,
      color,
      size,
      fit: category === 'tenis' ? null : 'normal',
      brand: null,
      photo_path: path,
      archived_at: null,
      created_at: new Date(Date.now() - i * 60000).toISOString(),
    };
  });
  const outfits = [
    ['Domingo sem pressa', [uid(1), uid(3), uid(4)]],
    ['Camadas leves', [uid(2), uid(3)]],
    ['Pronto para o dia', [uid(5), uid(3), uid(4)]],
  ].map(([name, item_ids], i) => ({
    id: uid(101 + i),
    user_id: demoUserId,
    name,
    item_ids,
    photo_path: null,
    created_at: new Date(Date.now() - i * 86400000).toISOString(),
  }));
  const wear = [
    {
      id: uid(201),
      user_id: demoUserId,
      outfit_id: outfits[0].id,
      worn_date: date(-1),
      notes: 'Café e uma volta pelo bairro.',
      created_at: new Date().toISOString(),
    },
    {
      id: uid(202),
      user_id: demoUserId,
      outfit_id: outfits[1].id,
      worn_date: date(-3),
      notes: null,
      created_at: new Date().toISOString(),
    },
  ];
  const posts = outfits.map((o, i) => ({
    id: uid(301 + i),
    user_id: demoUserId,
    outfit_id: o.id,
    caption: [
      'Conforto para o fim de semana.',
      'Texturas que combinam.',
      'Uma combinação para repetir.',
    ][i],
    created_at: new Date(Date.now() - i * 86400000).toISOString(),
  }));
  for (const [index, offset] of [-2, -4, -6, -8, -12, -16, -20].entries()) {
    wear.push({
      id: uid(210 + index),
      user_id: demoUserId,
      outfit_id: outfits[index % 3].id,
      worn_date: date(offset),
      notes: null,
      created_at: new Date().toISOString(),
    });
  }
  const prices = Object.fromEntries(
    [8990, 15990, 21990, 34990, 17990, 5990, 12990].map((price, i) => [uid(i + 1), price]),
  );
  let favoriteItems = [uid(3), uid(4)];
  let favoriteOutfits = [uid(101)];
  let evolution = freshEvolution();
  evolution.recipes = [
    {
      id: uid(601),
      title: 'Casual com contraste',
      folder: 'Para o dia a dia',
      source: '',
      note: 'Uma base clara, jeans e tênis caramelo.',
      slots: [
        { role: 'top', category: 'camiseta', color: 'Branco' },
        { role: 'bottom', category: 'calca', color: 'Azul' },
        { role: 'shoes', category: 'tenis', color: 'Caramelo' },
      ],
    },
  ];
  const plans = [
    {
      id: uid(401),
      title: 'Café com amigos',
      date: date(1),
      end_date: date(1),
      kind: 'day',
      outfit_ids: [uid(101)],
      item_ids: [],
      notes: 'Um look confortável para colocar a conversa em dia.',
      reminder: true,
    },
    {
      id: uid(402),
      title: 'Um fim de semana fora',
      date: date(5),
      end_date: date(7),
      kind: 'trip',
      outfit_ids: [uid(101), uid(102)],
      item_ids: [uid(6)],
      notes: 'Poucas peças, boas combinações.',
      reminder: false,
    },
  ];
  if (showcase) {
    evolution.recipes.push({
      id: uid(602),
      title: 'Uma pausa na rotina',
      folder: 'Dias tranquilos',
      source: '',
      note: 'Texturas suaves e peças que acompanham um dia sem pressa.',
      slots: [
        { role: 'top', category: 'camisa', color: 'Branco' },
        { role: 'bottom', category: 'calca', color: 'Azul' },
        { role: 'shoes', category: 'tenis', color: 'Caramelo' },
      ],
    });
    evolution.wishes = [
      {
        id: uid(701),
        title: 'Outra camiseta branca',
        category: 'camiseta',
        color: 'Branco',
        price: 8990,
        source: '',
        note: 'Quero entender se ela acrescenta algo ao que já tenho.',
        reflectUntil: date(7),
      },
      {
        id: uid(702),
        title: 'Camisa em tom de areia',
        category: 'camisa',
        color: 'Areia',
        price: 15990,
        source: '',
        note: 'Uma possibilidade para o trabalho e os fins de semana.',
        reflectUntil: null,
      },
    ];
    evolution.details[uid(3)] = {
      ...emptyDetail,
      story:
        'O jeans daquela viagem em que caminhamos sem olhar o relógio. Foi para a mala por acaso e voltou cheio de boas lembranças.',
      location: 'Gaveta das favoritas',
      care: 'Lavar do avesso e secar à sombra.',
      weightGrams: 650,
    };
    evolution.details[uid(2)] = {
      ...emptyDetail,
      story:
        'Um presente que virou companhia nos domingos mais frescos. Gosto de como a textura deixa qualquer combinação mais acolhedora.',
      weightGrams: 420,
    };
    evolution.decisions = [
      {
        id: uid(801),
        itemIds: [uid(1), uid(3), uid(4)],
        outfitId: uid(101),
        recipeId: uid(601),
        date: date(-2),
        kind: 'accepted',
        reason: 'Remix de exemplo',
      },
    ];
    evolution.feedback = [
      {
        id: uid(802),
        outfitId: uid(101),
        date: date(-1),
        comfort: true,
        confidence: true,
        weather: true,
        occasion: true,
        again: true,
        note: 'Um look leve para caminhar e encontrar amigos.',
      },
    ];
  }
  if (empty) {
    items.length = 0;
    outfits.length = 0;
    wear.length = 0;
    posts.length = 0;
    plans.length = 0;
    photos.clear();
    for (const id of Object.keys(prices)) delete prices[id];
    favoriteItems = [];
    favoriteOutfits = [];
    evolution = freshEvolution();
  }
  const studio = () => {
    const itemRows = items.map((item) => ({
      ...item,
      last_worn_date:
        wear
          .filter((w) => outfits.find((o) => o.id === w.outfit_id)?.item_ids.includes(item.id))
          .map((w) => w.worn_date)
          .sort()
          .at(-1) || null,
    }));
    return {
      items: itemRows,
      outfits: outfits.map(({ item_ids, ...outfit }) => ({
        ...outfit,
        items: item_ids.map((id) => itemRows.find((i) => i.id === id)),
        last_worn_date:
          wear
            .filter((w) => w.outfit_id === outfit.id)
            .map((w) => w.worn_date)
            .sort()
            .at(-1) || null,
      })),
      wear,
      prices,
      favorite_items: favoriteItems,
      favorite_outfits: favoriteOutfits,
      plans,
      evolution,
    };
  };
  const validDate = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
  };
  const circles = circleFixtures(demoUserId, studio);
  const identity = identityFixtures(
    demoUserId,
    () => ({ ...studio(), socialPosts: social.posts }),
    {
      needsVerification,
      socialFriends,
      showcaseAccount,
    },
  );
  const social = socialFixtures(demoUserId, identity, photos);
  const atelier = atelierFixtures(demoUserId, social, studio, (ids, name) => {
    const id = randomUUID(); outfits.unshift({ id, user_id: demoUserId, name, photo_path: null, created_at: new Date().toISOString(), item_ids: ids }); return id;
  });
  const join = (o) => ({
    id: o.id,
    user_id: o.user_id,
    name: o.name,
    photo_path: o.photo_path,
    created_at: o.created_at,
    outfit_items: o.item_ids.map((id) => ({ wardrobe_items: items.find((i) => i.id === id) })),
  });
  const selected = (rows, url) => {
    const filter = url.searchParams.get('id');
    return filter ? rows.filter((r) => r.id === filter.replace('eq.', '')) : rows;
  };
  const page = (rows, url) =>
    rows.slice(
      Number(url.searchParams.get('offset') || 0),
      Number(url.searchParams.get('offset') || 0) + Number(url.searchParams.get('limit') || 1000),
    );
  return {
    photos,
    async handle(url, method, body, headers) {
      const single = String(headers.accept || '').includes('vnd.pgrst.object');
      const id = url.searchParams.get('id')?.replace('eq.', '');
      const result = (data, status = 200) => ({ data, status });
      const fail = (message, code = '22023', status = 400) => result({ message, code }, status);
      if (url.pathname === '/preview/v1/account-export') return result({ format: 'virtual-closet-export-v1', exportedAt: new Date().toISOString(), accountId: demoUserId, studio: studio(), media: items.filter(i => i.photo_path).map(i => ({ bucket: 'closet-photos', path: i.photo_path })) });
      if (url.pathname === '/preview/v1/atelier') { try { return result(atelier.handle(body)); } catch (error) { return fail(error.message); } }
      if (url.pathname === '/preview/v1/social') {
        try {
          return result(social.handle(body?.name, body?.args));
        } catch (error) {
          return fail(error.message);
        }
      }
      if (url.pathname === '/preview/v1/identity') {
        try {
          const data = identity.handle(body?.name, body?.args);
          if (body?.name === 'profile_save' && data.profile)
            evolution.profile.name = data.profile.firstName;
          return result(data);
        } catch (error) {
          return fail(error.message);
        }
      }
      if (url.pathname === '/preview/v1/circles') {
        try {
          if (method !== 'GET' && method !== 'POST') return fail('Ação inválida.');
          return result(circles(method === 'POST' ? body : undefined));
        } catch (error) {
          return fail(error.message);
        }
      }
      if (url.pathname === '/preview/v1/studio') {
        if (method === 'GET') return result(studio());
        if (method !== 'POST' || !body) return fail('Ação inválida.');
        if (
          [
            'profile',
            'item_detail',
            'recipe',
            'remove_recipe',
            'wish',
            'remove_wish',
            'feedback',
            'decision',
            'clear_learning',
            'plan_detail',
          ].includes(body.action)
        ) {
          try {
            evolution = applyEvolution(studio(), evolution, body, date(0));
            return result(studio());
          } catch (error) {
            return fail(error.message);
          }
        }
        if (body.action === 'favorite_item' || body.action === 'favorite_outfit') {
          const isItem = body.action === 'favorite_item';
          if (!(isItem ? items : outfits).some((row) => row.id === body.id))
            return fail('Este conteúdo não está na prévia.');
          const previous = isItem ? favoriteItems : favoriteOutfits;
          const next = previous.includes(body.id)
            ? previous.filter((id) => id !== body.id)
            : [...previous, body.id];
          if (isItem) favoriteItems = next;
          else favoriteOutfits = next;
        } else if (body.action === 'price') {
          if (!items.some((i) => i.id === body.id)) return fail('Peça não encontrada.');
          if (body.cents === null) delete prices[body.id];
          else if (Number.isSafeInteger(body.cents) && body.cents >= 0 && body.cents <= 100000000)
            prices[body.id] = body.cents;
          else return fail('Preço inválido.');
        } else if (body.action === 'plan') {
          const p = body.plan;
          if (
            !p ||
            typeof p.title !== 'string' ||
            !p.title.trim() ||
            p.title.trim().length > 80 ||
            typeof p.notes !== 'string' ||
            p.notes.length > 300 ||
            !validDate(p.date) ||
            !validDate(p.end_date) ||
            p.end_date < p.date ||
            !['day', 'party', 'wedding', 'trip'].includes(p.kind) ||
            typeof p.reminder !== 'boolean'
          )
            return fail('Confira o nome, as datas e os detalhes do evento.');
          if (
            !Array.isArray(p.outfit_ids) ||
            !Array.isArray(p.item_ids) ||
            p.outfit_ids.length + p.item_ids.length === 0 ||
            p.outfit_ids.length > 30 ||
            p.item_ids.length > 100 ||
            new Set(p.outfit_ids).size !== p.outfit_ids.length ||
            new Set(p.item_ids).size !== p.item_ids.length ||
            p.outfit_ids.some((id) => !outfits.some((o) => o.id === id)) ||
            p.item_ids.some((id) => !items.some((i) => i.id === id && !i.archived_at))
          )
            return fail('Selecione pelo menos uma combinação ou peça válida.');
          const value = {
            id: p.id || randomUUID(),
            title: p.title.trim(),
            date: p.date,
            end_date: p.end_date,
            kind: p.kind,
            notes: p.notes.trim(),
            outfit_ids: p.outfit_ids,
            item_ids: p.item_ids,
            reminder: p.reminder,
          };
          const index = plans.findIndex((plan) => plan.id === value.id);
          if (index >= 0) {
            plans[index] = value;
            const d = evolution.planDetails[value.id];
            if (d) {
              d.days = Object.fromEntries(
                Object.entries(d.days).filter(
                  ([day]) => day >= value.date && day <= value.end_date,
                ),
              );
              const looks = new Set([
                ...value.outfit_ids,
                ...d.backupOutfitIds,
                ...Object.values(d.days).flat(),
              ]);
              const allowed = new Set([
                ...value.item_ids,
                ...outfits.filter((o) => looks.has(o.id)).flatMap((o) => o.item_ids),
              ]);
              d.packed = d.packed.filter((id) => allowed.has(id));
            }
          } else plans.push(value);
        } else if (body.action === 'remove_plan') {
          const index = plans.findIndex((p) => p.id === body.id);
          if (index < 0) return fail('Evento não encontrado.');
          delete evolution.planDetails[body.id];
          plans.splice(index, 1);
        } else return fail('Ação indisponível nesta prévia.');
        return result(studio());
      }
      if (url.pathname.startsWith('/auth/')) {
        if (url.pathname.endsWith('/logout')) return result({});
        if (url.pathname.endsWith('/user')) {
          if (method === 'PUT') authUser.user_metadata = { ...authUser.user_metadata, ...body?.data };
          return result(authUser);
        }
        if (url.pathname.endsWith('/signup')) {
          authUser.user_metadata = body?.data || {};
          authUser.email = body?.email || demoUser.email;
          identity.beginSignup();
          return result(authUser);
        }
        if (url.pathname.endsWith('/otp') || url.pathname.endsWith('/resend')) return result({});
        if (url.pathname.endsWith('/verify')) {
          try {
            identity.verify(body?.token);
            return result(sessionFor('otp'));
          } catch {
            return fail('Token has expired or is invalid', 'otp_expired', 403);
          }
        }
        return result(sessionFor());
      }
      if (url.pathname.startsWith('/storage/')) {
        const match = url.pathname.match(
          /\/object\/(?:sign\/)?(closet-photos|profile-photos|mural-photos|profile-banners)\/(.+)/,
        );
        const bucket = match?.[1];
        const path = match?.[2];
        if (path && method === 'POST' && url.pathname.includes('/sign/'))
          return result({ signedURL: `/object/sign/${bucket}/${path}?token=preview` });
        if (path && method === 'POST') {
          if (photos.has(path) && headers['x-upsert'] !== 'true')
            return result({ statusCode: '409', code: 'ResourceAlreadyExists', message: 'The resource already exists' }, 409);
          photos.set(path, { buffer: body });
          return result({ Key: `${bucket}/${path}` });
        }
        if (path && method === 'GET')
          return { photo: photos.get(path), status: photos.has(path) ? 200 : 404 };
        if (method === 'DELETE') {
          for (const path of body?.prefixes || []) photos.delete(path);
          return result([]);
        }
        return result({});
      }
      const table = url.pathname.split('/').at(-1);
      if (table === 'wardrobe_items') {
        if (method === 'POST') {
          const value = { ...body, archived_at: null, created_at: new Date().toISOString() };
          items.unshift(value);
          return result(single ? value : [value], 201);
        }
        if (method === 'PATCH') {
          const value = items.find((i) => i.id === id);
          if (!value) return fail('Not found', 'PGRST116', 404);
          Object.assign(value, body);
          return result(single ? value : [value]);
        }
        let rows = selected(items, url);
        if (url.searchParams.get('archived_at') === 'is.null')
          rows = rows.filter((i) => !i.archived_at);
        for (const filter of url.searchParams.getAll('category')) {
          rows = filter.startsWith('in.(')
            ? rows.filter((i) => filter.slice(4, -1).split(',').includes(i.category))
            : rows.filter((i) => i.category === filter.replace('eq.', ''));
        }
        const expression = url.searchParams.get('or');
        if (expression) {
          const q = expression.match(/%([^%]*)%/)?.[1]?.toLowerCase() || '';
          rows = rows.filter((i) => `${i.name} ${i.color}`.toLowerCase().includes(q));
        }
        return result(single ? rows[0] : page(rows, url));
      }
      if (table === 'item_last_worn')
        return result(
          items.map((i) => ({
            item_id: i.id,
            last_worn_date:
              wear
                .filter((w) => outfits.find((o) => o.id === w.outfit_id)?.item_ids.includes(i.id))
                .map((w) => w.worn_date)
                .sort()
                .at(-1) || null,
          })),
        );
      if (table === 'outfit_last_worn')
        return result(
          outfits.map((o) => ({
            outfit_id: o.id,
            last_worn_date:
              wear
                .filter((w) => w.outfit_id === o.id)
                .map((w) => w.worn_date)
                .sort()
                .at(-1) || null,
          })),
        );
      if (table === 'create_outfit') {
        const ids = body.p_item_ids;
        if (
          !ids?.length ||
          new Set(ids).size !== ids.length ||
          ids.some((id) => !items.some((i) => i.id === id && !i.archived_at))
        )
          return fail('Invalid items');
        const o = {
          id: randomUUID(),
          user_id: demoUserId,
          name: body.p_name,
          photo_path: body.p_photo_path,
          item_ids: ids,
          created_at: new Date().toISOString(),
        };
        outfits.unshift(o);
        return result(o.id);
      }
      if (table === 'outfits') {
        const rows = selected(outfits, url).map(join);
        return result(single ? rows[0] : page(rows, url));
      }
      if (table === 'wear_log') {
        if (method === 'POST') {
          if (wear.some((w) => w.outfit_id === body.outfit_id && w.worn_date === body.worn_date))
            return fail('Duplicate', '23505', 409);
          wear.push({ ...body, id: randomUUID(), created_at: new Date().toISOString() });
          return result(null, 201);
        }
        if (method === 'DELETE') {
          const i = wear.findIndex((w) => w.id === id);
          if (i >= 0) wear.splice(i, 1);
          return result(null);
        }
        let rows = wear;
        const dates = url.searchParams.getAll('worn_date');
        for (const filter of dates) {
          if (filter.startsWith('gte.')) rows = rows.filter((w) => w.worn_date >= filter.slice(4));
          if (filter.startsWith('lte.')) rows = rows.filter((w) => w.worn_date <= filter.slice(4));
        }
        return result(page(rows, url));
      }
      if (table === 'posts') {
        if (method === 'POST') {
          posts.unshift({ ...body, id: randomUUID(), created_at: new Date().toISOString() });
          return result(null, 201);
        }
        if (method === 'DELETE') {
          const i = posts.findIndex((p) => p.id === id);
          if (i >= 0) posts.splice(i, 1);
          return result(null);
        }
        return result(
          page(posts, url).map((p) => ({
            ...p,
            outfits: join(outfits.find((o) => o.id === p.outfit_id)),
          })),
        );
      }
      return fail('Preview route unavailable');
    },
  };
}
