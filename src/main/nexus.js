const GAME = 'eldenring';
const APPLICATION = 'Erdtree Launcher';
const APP_VERSION = '2.0.0';

const KEY_MISSING =
  'بحث Nexus يحتاج مفتاح شخصي (مجاني). حطه مرة وحدة من خيار «مفتاح Nexus» تحت.';
const INVALID_KEY =
  'مفتاح Nexus مو صحيح أو منتهي. تأكد منه من إعدادات Nexus وجرّب مرة ثانية.';
const ACCESS_BLOCKED =
  'Nexus رفض الطلب (403). غالباً المفتاح ما عنده صلاحية كافية أو الاتصال محجوب — تأكد من المفتاح وجرّب لاحقاً.';

function apiBase() {
  return (process.env.ERDTREE_NEXUS_API || 'https://api.nexusmods.com').replace(/\/+$/, '');
}

function fatalNexus(err) {
  return ['NEXUS_AUTH', 'NEXUS_BLOCKED', 'NEXUS_KEY_MISSING'].includes(err?.code);
}

function headers(key) {
  return {
    apikey: key,
    'Application-Name': APPLICATION,
    'Application-Version': APP_VERSION,
    'User-Agent': `${APPLICATION}/${APP_VERSION}`,
    Accept: 'application/json',
  };
}

function graphqlEndpoint() {
  const base = apiBase();
  return /\/graphql$/i.test(base) ? base : `${base}/v1/graphql`;
}

async function requestJson(url, key, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout || 25000);
  try {
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers: { ...headers(key), ...(options.headers || {}) },
      body: options.body,
      signal: controller.signal,
      redirect: 'follow',
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    if (res.status === 401) {
      const err = new Error(INVALID_KEY);
      err.code = 'NEXUS_AUTH';
      throw err;
    }
    if (res.status === 403) {
      const err = new Error(ACCESS_BLOCKED);
      err.code = 'NEXUS_BLOCKED';
      throw err;
    }
    if (!res.ok) {
      const err = new Error(`Nexus رفض الطلب (خطأ ${res.status}).`);
      err.code = 'NEXUS_HTTP';
      throw err;
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeout = new Error('Nexus تأخر بالرد. جرّب مرة ثانية.');
      timeout.code = 'NEXUS_TIMEOUT';
      throw timeout;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeMod(node) {
  const modId = Number(node.modId ?? node.mod_id ?? node.id ?? 0);
  return {
    id: modId,
    name: String(node.name || node.mod_name || 'مود بدون اسم'),
    summary: String(node.summary || node.description || '').replace(/<[^>]+>/g, '').slice(0, 240),
    image: String(node.pictureUrl || node.picture_url || node.image || ''),
    downloads: Number(node.downloads ?? node.mod_downloads ?? node.download_count ?? 0) || 0,
    author: String(node.author || node.uploaded_by || ''),
    version: String(node.version || ''),
    updatedAt: node.updatedAt || node.updated_at || null,
    pageUrl: modId ? `https://www.nexusmods.com/${GAME}/mods/${modId}` : '',
    game: node.gameDomainName || node.game?.domainName || GAME,
  };
}

const SEARCH_QUERIES = [
  {
    query: `query SearchMods($filter: ModsFilter, $count: Int, $offset: Int) {
      mods(filter: $filter, count: $count, offset: $offset) {
        nodes { modId name summary pictureUrl downloads gameDomainName }
        totalCount
      }
    }`,
    filter: (query) => ({
      gameDomainName: [{ value: GAME, op: 'EQUALS' }],
      nameStemmed: [{ value: query, op: 'WILDCARD' }],
    }),
  },
  {
    query: `query SearchMods($filter: ModFilterValue, $count: Int, $offset: Int) {
      mods(filter: $filter, count: $count, offset: $offset) {
        nodes { modId name summary pictureUrl downloads gameDomainName }
        totalCount
      }
    }`,
    filter: (query) => ({
      gameDomainName: [{ value: GAME, op: 'EQUALS' }],
      name: [{ value: query, op: 'WILDCARD' }],
    }),
  },
];

async function graphqlSearch(key, query, limit) {
  let lastError = null;
  for (const attempt of SEARCH_QUERIES) {
    try {
      const data = await requestJson(graphqlEndpoint(), key, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: attempt.query,
          variables: {
            filter: attempt.filter(query),
            count: limit,
            offset: 0,
          },
        }),
      });
      if (data?.errors?.length) {
        lastError = new Error(data.errors[0].message || 'استعلام Nexus غير صالح.');
        continue;
      }
      const nodes = data?.data?.mods?.nodes;
      if (Array.isArray(nodes)) {
        return { mods: nodes.map(normalizeMod), source: 'graphql' };
      }
    } catch (err) {
      lastError = err;
      if (fatalNexus(err)) throw err;
    }
  }
  throw lastError || new Error('ما قدرنا نبحث في Nexus.');
}

async function restSearch(key, query, limit) {
  const endpoints = [
    `${apiBase()}/v1/games/${GAME}/mods/latest_added.json?count=${limit}`,
    `${apiBase()}/v1/games/${GAME}/mods/trending.json?count=${limit}`,
  ];
  const needle = String(query || '').toLowerCase();
  const found = new Map();
  for (const url of endpoints) {
    try {
      const data = await requestJson(url, key);
      const list = Array.isArray(data) ? data : data?.mods || [];
      for (const item of list) {
        const mod = normalizeMod(item);
        if (!needle || mod.name.toLowerCase().includes(needle) || mod.summary.toLowerCase().includes(needle)) {
          if (mod.id) found.set(mod.id, mod);
        }
      }
    } catch (err) {
      if (fatalNexus(err)) throw err;
    }
  }
  return { mods: [...found.values()].slice(0, limit), source: 'rest' };
}

async function search({ query, apiKey, limit = 24 }) {
  const key = String(apiKey || '').trim();
  if (!key) {
    const err = new Error(KEY_MISSING);
    err.code = 'NEXUS_KEY_MISSING';
    throw err;
  }
  const q = String(query || '').trim();
  if (!q) throw new Error('اكتب اسم المود اللي تدور عليه.');
  try {
    const result = await graphqlSearch(key, `*${q}*`, limit);
    if (result.mods.length) return result;
  } catch (err) {
    if (fatalNexus(err)) throw err;
  }
  return restSearch(key, q, limit);
}

async function validateKey(key) {
  const data = await requestJson(`${apiBase()}/v1/users/validate.json`, key);
  return {
    valid: !!data,
    name: data?.name || '',
    isPremium: !!data?.is_premium,
    isSupporter: !!data?.is_supporter,
  };
}

module.exports = {
  GAME,
  KEY_MISSING,
  INVALID_KEY,
  ACCESS_BLOCKED,
  search,
  validateKey,
  apiBase,
};
