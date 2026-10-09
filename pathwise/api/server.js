import express from 'express';
import initSqlJs from 'sql.js';
import pg from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const databasePath = resolve(process.env.DATA_DIR || resolve(currentDir, '../data'), 'pathwise.sqlite');
const usePostgres = Boolean(process.env.DATABASE_URL);
if (!usePostgres) mkdirSync(dirname(databasePath), { recursive: true });
if (process.env.RENDER && !usePostgres) throw new Error('Set DATABASE_URL to a Neon Postgres database before deploying on Render Free.');

const normalizeParameters = (parameters) => parameters.length === 1 && parameters[0] && typeof parameters[0] === 'object' && !Array.isArray(parameters[0])
  ? parameters[0]
  : parameters;
const sqliteParameters = (parameters) => {
  const value = normalizeParameters(parameters);
  return Array.isArray(value) ? value : value;
};
const asyncContext = new AsyncLocalStorage();
const { Pool } = pg;
const pool = usePostgres ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
}) : null;
const SQL = usePostgres ? null : await initSqlJs({ locateFile: (file) => resolve(currentDir, '../node_modules/sql.js/dist', file) });
const sqlite = usePostgres ? null : new SQL.Database(existsSync(databasePath) ? new Uint8Array(readFileSync(databasePath)) : undefined);
let transactionDepth = 0;
const persist = () => {
  if (!usePostgres && transactionDepth === 0) writeFileSync(databasePath, Buffer.from(sqlite.export()));
};
const toPostgresSql = (sql) => {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
};
const query = async (sql, parameters = []) => {
  if (usePostgres) {
    const client = asyncContext.getStore() ?? pool;
    return client.query(toPostgresSql(sql), normalizeParameters(parameters));
  }
  return sqlite.run(sql, sqliteParameters(parameters));
};
const database = {
  exec: async (sql) => {
    if (usePostgres) await query(sql);
    else sqlite.exec(sql);
    persist();
  },
  prepare: (sql) => ({
    get: async (...parameters) => {
      if (usePostgres) return (await query(sql, parameters)).rows[0];
      const statement = sqlite.prepare(sql);
      const values = sqliteParameters(parameters);
      if (values.length) statement.bind(values);
      const result = statement.step() ? statement.getAsObject() : undefined;
      statement.free();
      return result;
    },
    all: async (...parameters) => {
      if (usePostgres) return (await query(sql, parameters)).rows;
      const statement = sqlite.prepare(sql);
      const values = sqliteParameters(parameters);
      if (values.length) statement.bind(values);
      const rows = [];
      while (statement.step()) rows.push(statement.getAsObject());
      statement.free();
      return rows;
    },
    run: async (...parameters) => {
      if (usePostgres) {
        const result = await query(sql, parameters);
        persist();
        return { lastInsertRowid: result.rows[0]?.id, changes: result.rowCount };
      }
      sqlite.run(sql, sqliteParameters(parameters));
      persist();
      return { lastInsertRowid: sqlite.exec('SELECT last_insert_rowid() AS id')[0]?.values[0]?.[0] };
    },
  }),
  transaction: (callback) => async (...args) => {
    if (usePostgres) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await asyncContext.run(client, () => callback(...args));
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
    sqlite.run('BEGIN TRANSACTION');
    transactionDepth += 1;
    try {
      const result = await callback(...args);
      sqlite.run('COMMIT');
      transactionDepth -= 1;
      persist();
      return result;
    } catch (error) {
      sqlite.run('ROLLBACK');
      transactionDepth -= 1;
      throw error;
    }
  },
};

const sqliteSchema = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    initials TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT 'avatar-blue',
    password_salt TEXT,
    password_hash TEXT
  );
  CREATE TABLE IF NOT EXISTS friendships (
    user_id INTEGER NOT NULL REFERENCES users(id),
    friend_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'accepted',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, friend_id)
  );
  CREATE TABLE IF NOT EXISTS activity (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    path_id TEXT NOT NULL,
    topic_id TEXT NOT NULL,
    topic_title TEXT NOT NULL,
    event_type TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS learning_paths (
    id TEXT PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    duration TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS path_sections (
    id INTEGER PRIMARY KEY,
    path_id TEXT NOT NULL REFERENCES learning_paths(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    sort_order INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS path_lessons (
    id INTEGER PRIMARY KEY,
    section_id INTEGER NOT NULL REFERENCES path_sections(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    sort_order INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS activity_user_time ON activity(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS activity_topic_latest ON activity(user_id, topic_id, id DESC);
  CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
`;
const postgresSchema = sqliteSchema
  .replace(/id INTEGER PRIMARY KEY/g, 'id SERIAL PRIMARY KEY')
  .replace('expires_at INTEGER NOT NULL', 'expires_at BIGINT NOT NULL');
if (!usePostgres) sqlite.run('PRAGMA foreign_keys = ON');
await database.exec(usePostgres ? postgresSchema : sqliteSchema);

if (!usePostgres) {
  const userColumns = new Set((await database.prepare('PRAGMA table_info(users)').all()).map((column) => column.name));
  if (!userColumns.has('password_salt')) await database.exec('ALTER TABLE users ADD COLUMN password_salt TEXT');
  if (!userColumns.has('password_hash')) await database.exec('ALTER TABLE users ADD COLUMN password_hash TEXT');
}

const getUser = database.prepare('SELECT * FROM users WHERE username = ?');
const createUser = database.prepare(`
  INSERT INTO users (username, display_name, initials, color, password_salt, password_hash)
  VALUES (?, ?, ?, 'avatar-blue', ?, ?)
`);
const updateLegacyUser = database.prepare(`
  UPDATE users SET display_name = ?, initials = ?, color = 'avatar-blue', password_salt = ?, password_hash = ?
  WHERE id = ? AND password_hash IS NULL
`);
const insertFriendship = database.prepare(`
  INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, 'accepted')
  ON CONFLICT (user_id, friend_id) DO NOTHING
`);
await database.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());

const app = express();
app.use(express.json({ limit: '32kb' }));

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const sessionUser = database.prepare(`
  SELECT s.token_hash AS "tokenHash", u.id, u.username, u.display_name AS name, u.initials
  FROM sessions s JOIN users u ON u.id = s.user_id
  WHERE s.token_hash = ? AND s.expires_at > ? AND u.password_hash IS NOT NULL
`);
const insertSession = database.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)');
const deleteSession = database.prepare('DELETE FROM sessions WHERE token_hash = ?');
const hashToken = (token) => createHash('sha256').update(token).digest('hex');

const getCookie = (request, name) => {
  const cookies = request.headers.cookie?.split(';') ?? [];
  const cookie = cookies.map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : '';
};

const asyncHandler = (handler) => (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);

const requireAuth = (request, response, next) => {
  const token = getCookie(request, 'pathwise_session');
  if (!token) return response.status(401).json({ error: 'Sign in to continue.' });
  const tokenHash = hashToken(token);
  return sessionUser.get(tokenHash, Date.now()).then((user) => {
    if (user) {
      request.user = user;
      request.sessionTokenHash = tokenHash;
      return next();
    }
    return response.status(401).json({ error: 'Sign in to continue.' });
  }).catch(next);
};

const createSession = async (user, response) => {
  const token = randomBytes(32).toString('base64url');
  await insertSession.run(hashToken(token), user.id, Date.now() + SESSION_TTL_SECONDS * 1000);
  const secure = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true' ? '; Secure' : '';
  response.setHeader('Set-Cookie', `pathwise_session=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}${secure}`);
};

app.post('/api/auth/register', asyncHandler(async (request, response) => {
  const username = String(request.body?.username || '').trim().toLowerCase();
  const displayName = String(request.body?.displayName || '').trim();
  const password = String(request.body?.password || '');
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    return response.status(400).json({ error: 'Username must be 3–30 characters using letters, numbers, dots, underscores, or hyphens.' });
  }
  if (displayName.length < 2 || displayName.length > 50) {
    return response.status(400).json({ error: 'Display name must be 2–50 characters.' });
  }
  if (password.length < 8 || password.length > 128) {
    return response.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const existing = await getUser.get(username);
  if (existing?.password_hash) return response.status(409).json({ error: 'That username is already registered.' });
  const salt = randomBytes(16).toString('hex');
  const passwordHash = scryptSync(password, salt, 64).toString('hex');
  const initials = displayName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  if (existing) await updateLegacyUser.run(displayName, initials, salt, passwordHash, existing.id);
  else await createUser.run(username, displayName, initials, salt, passwordHash);
  const user = await getUser.get(username);
  await createSession(user, response);
  return response.status(201).json({ user: { username, name: displayName, initials } });
}));

app.post('/api/auth/login', asyncHandler(async (request, response) => {
  const username = String(request.body?.username || '').trim().toLowerCase();
  const password = String(request.body?.password || '');
  const user = await getUser.get(username);
  if (!user?.password_salt || !user.password_hash || password.length > 128) {
    return response.status(401).json({ error: 'Username or password is incorrect.' });
  }
  const actual = scryptSync(password, user.password_salt, 64);
  const expected = Buffer.from(user.password_hash, 'hex');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return response.status(401).json({ error: 'Username or password is incorrect.' });
  }
  await createSession(user, response);
  return response.json({ user: { username: user.username, name: user.display_name, initials: user.initials } });
}));

app.post('/api/auth/logout', asyncHandler(async (request, response) => {
  const token = getCookie(request, 'pathwise_session');
  if (token) await deleteSession.run(hashToken(token));
  const secure = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true' ? '; Secure' : '';
  response.setHeader('Set-Cookie', `pathwise_session=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${secure}`);
  return response.status(204).end();
}));

const getFriends = database.prepare(`
  SELECT u.username, u.display_name AS name, u.initials, u.color,
    COALESCE((
      SELECT a.topic_title FROM activity a
      WHERE a.user_id = u.id AND a.event_type = 'topic_completed'
      ORDER BY a.id DESC LIMIT 1
    ), 'Ready to learn with you') AS status
  FROM friendships f JOIN users u ON u.id = f.friend_id
  WHERE f.user_id = ? AND f.status = 'accepted' AND u.password_hash IS NOT NULL
  ORDER BY u.display_name
`);
const getCustomPaths = database.prepare(`
  SELECT p.id, p.owner_id AS "ownerId", owner.username AS "ownerUsername",
    p.title, p.description, p.category, p.duration, p.color
  FROM learning_paths p JOIN users owner ON owner.id = p.owner_id
  WHERE p.owner_id = ? OR p.owner_id IN (
    SELECT friend_id FROM friendships WHERE user_id = ? AND status = 'accepted'
  )
  ORDER BY p.created_at DESC, p.id
`);
const getPathSections = database.prepare(`
  SELECT id, title, description FROM path_sections
  WHERE path_id = ? ORDER BY sort_order, id
`);
const getSectionLessons = database.prepare(`
  SELECT title, description FROM path_lessons
  WHERE section_id = ? ORDER BY sort_order, id
`);

const getCompletedTopicIds = database.prepare(`
  SELECT latest.topic_id
  FROM (
    SELECT topic_id, MAX(id) AS latest_id
    FROM activity
    WHERE user_id = ? AND event_type IN ('topic_completed', 'topic_reopened')
    GROUP BY topic_id
  ) state JOIN activity latest ON latest.id = state.latest_id
  WHERE latest.event_type = 'topic_completed'
`);

const getLatestTimer = database.prepare(`
  SELECT path_id AS "pathId", topic_id AS "topicId", topic_title AS "topicTitle",
    event_type AS "eventType", duration_seconds AS "durationSeconds", created_at AS "createdAt"
  FROM activity
  WHERE user_id = ? AND event_type IN ('timer_started', 'timer_paused', 'timer_reset', 'timer_checkpoint')
  ORDER BY id DESC LIMIT 1
`);

const getFeed = database.prepare(`
  SELECT a.id, u.username, u.display_name AS name, u.initials, u.color,
    a.path_id AS "pathId", a.topic_id AS "topicId", a.topic_title AS "topicTitle",
    a.event_type AS "eventType", a.duration_seconds AS "durationSeconds",
    a.created_at AS "createdAt"
  FROM activity a JOIN users u ON u.id = a.user_id
  WHERE (a.user_id = ? OR a.user_id IN (
    SELECT friend_id FROM friendships WHERE user_id = ? AND status = 'accepted'
  )) AND u.password_hash IS NOT NULL
  AND a.event_type <> 'timer_checkpoint'
  ORDER BY a.created_at DESC, a.id DESC
`);

const buildBootstrap = async (user) => {
  const friends = await getFriends.all(user.id);
  const customPathRows = await getCustomPaths.all(user.id, user.id);
  const customPaths = await Promise.all(customPathRows.map(async (path) => {
    const sectionRows = await getPathSections.all(path.id);
    const sections = await Promise.all(sectionRows.map(async (section) => ({
      title: section.title,
      description: section.description,
      lessons: await getSectionLessons.all(section.id),
    })));
    return { ...path, sections };
  }));
  const friendProgress = await Promise.all(friends.map(async (friend) => {
    const friendUser = await getUser.get(friend.username);
    const completedTopicIds = await getCompletedTopicIds.all(friendUser.id);
    return { ...friend, completedTopicIds: completedTopicIds.map((item) => item.topic_id) };
  }));
  const topicIds = (await getCompletedTopicIds.all(user.id)).map((item) => item.topic_id);
  const todayQuery = usePostgres
    ? `SELECT COUNT(DISTINCT topic_id) AS count FROM activity WHERE user_id = ? AND event_type = 'topic_completed' AND created_at >= date_trunc('day', NOW())`
    : `SELECT COUNT(DISTINCT topic_id) AS count FROM activity WHERE user_id = ? AND event_type = 'topic_completed' AND created_at >= datetime('now', 'start of day')`;
  const todayCount = Number((await database.prepare(todayQuery).get(user.id)).count);
  const latestTimer = await getLatestTimer.get(user.id);
  let timer = null;
  if (latestTimer && latestTimer.eventType !== 'timer_reset') {
    const seconds = Math.max(0, Number(latestTimer.durationSeconds) || 0);
    if (latestTimer.eventType === 'timer_started') {
      const startedAt = latestTimer.createdAt instanceof Date
        ? latestTimer.createdAt.getTime()
        : new Date(`${latestTimer.createdAt}Z`).getTime();
      const elapsedSinceStart = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      const recentlyStarted = elapsedSinceStart <= 15;
      timer = {
        pathId: latestTimer.pathId,
        topicId: latestTimer.topicId,
        topicTitle: latestTimer.topicTitle,
        seconds: seconds + (recentlyStarted ? elapsedSinceStart : 0),
        isRunning: recentlyStarted,
      };
    } else {
      timer = { ...latestTimer, seconds, isRunning: false };
    }
  }

  return {
    user: { username: user.username, name: user.display_name, initials: user.initials },
    friends,
    friendProgress,
    customPaths,
    topicIds,
    todayCount,
    timer,
    activity: await getFeed.all(user.id, user.id),
  };
};

app.get('/api/auth/session', asyncHandler(async (request, response) => {
  const token = getCookie(request, 'pathwise_session');
  const user = token ? await sessionUser.get(hashToken(token), Date.now()) : null;
  if (!user) return response.json({ authenticated: false });
  return response.json({ authenticated: true, data: await buildBootstrap(user) });
}));

app.get('/api/bootstrap', requireAuth, asyncHandler(async (request, response) => response.json(await buildBootstrap(request.user))));

const insertPath = database.prepare(`
  INSERT INTO learning_paths (id, owner_id, title, description, category, duration, color)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const insertSection = database.prepare(`
  INSERT INTO path_sections (path_id, title, description, sort_order)
  VALUES (?, ?, ?, ?)
  RETURNING id
`);
const insertLesson = database.prepare(`
  INSERT INTO path_lessons (section_id, title, description, sort_order)
  VALUES (?, ?, ?, ?)
`);
const getOwnedPath = database.prepare('SELECT id FROM learning_paths WHERE id = ? AND owner_id = ?');
const countSections = database.prepare('SELECT COUNT(*) AS count FROM path_sections WHERE path_id = ?');

const normalizeSection = (section) => {
  const title = String(section?.title || '').trim();
  const description = String(section?.description || '').trim();
  const lessons = Array.isArray(section?.lessons) ? section.lessons.map((lesson) => ({
    title: String(lesson?.title || '').trim(),
    description: String(lesson?.description || '').trim(),
  })) : [];
  if (!title || title.length > 100 || description.length > 240 || lessons.length < 1 || lessons.length > 40) return null;
  if (lessons.some((lesson) => !lesson.title || lesson.title.length > 120 || lesson.description.length > 240)) return null;
  return { title, description, lessons };
};

const insertSectionWithLessons = async (pathId, section, order) => {
  const result = await insertSection.run(pathId, section.title, section.description, order);
  for (const [index, lesson] of section.lessons.entries()) {
    await insertLesson.run(Number(result.lastInsertRowid), lesson.title, lesson.description, index);
  }
};

app.post('/api/paths', requireAuth, asyncHandler(async (request, response) => {
  const { title, description, category, duration, color } = request.body ?? {};
  const normalizedTitle = String(title || '').trim();
  const normalizedDescription = String(description || '').trim();
  const normalizedCategory = String(category || '').trim();
  const normalizedDuration = String(duration || 'Self-paced').trim();
  const sections = Array.isArray(request.body?.sections) ? request.body.sections.map(normalizeSection) : [];
  const colors = new Set(['mint', 'coral', 'blue', 'yellow', 'lavender']);
  if (!normalizedTitle || normalizedTitle.length > 80 || normalizedDescription.length > 300 || !normalizedCategory || normalizedCategory.length > 40 || normalizedDuration.length > 40 || !colors.has(color) || sections.length < 1 || sections.length > 30 || sections.some((section) => !section)) {
    return response.status(400).json({ error: 'Add a path title, category, and at least one complete section with lessons.' });
  }

  const pathId = `custom-${randomUUID().replace(/-/g, '')}`;
  const createPath = database.transaction(async () => {
    await insertPath.run(pathId, request.user.id, normalizedTitle, normalizedDescription, normalizedCategory, normalizedDuration, color);
    for (const [index, section] of sections.entries()) await insertSectionWithLessons(pathId, section, index);
  });
  await createPath();
  return response.status(201).json({ id: pathId });
}));

app.post('/api/paths/:pathId/sections', requireAuth, asyncHandler(async (request, response) => {
  const path = await getOwnedPath.get(request.params.pathId, request.user.id);
  if (!path) return response.status(404).json({ error: 'Only the path owner can add sections.' });
  const section = normalizeSection(request.body);
  if (!section) return response.status(400).json({ error: 'A section needs a title and at least one lesson.' });
  const order = (await countSections.get(path.id)).count;
  const addSection = database.transaction(() => insertSectionWithLessons(path.id, section, order));
  await addSection();
  return response.status(201).json({ added: true });
}));

app.post('/api/activity', requireAuth, asyncHandler(async (request, response) => {
  const { pathId, topicId, topicTitle, eventType, durationSeconds = 0 } = request.body ?? {};
  const allowedEvents = new Set(['topic_completed', 'topic_reopened', 'timer_started', 'timer_paused', 'timer_reset', 'timer_checkpoint', 'timer_completed']);
  const user = request.user;
  if (!pathId || !topicId || !topicTitle || String(pathId).length > 40 || String(topicId).length > 100 || String(topicTitle).length > 160 || !allowedEvents.has(eventType)) {
    return response.status(400).json({ error: 'A valid topic, path and activity type are required.' });
  }

  const result = database.prepare(`
    INSERT INTO activity (user_id, path_id, topic_id, topic_title, event_type, duration_seconds)
    VALUES (?, ?, ?, ?, ?, ?)
    RETURNING id
  `);
  const inserted = await result.run(user.id, pathId, topicId, topicTitle, eventType, Math.min(86400, Math.max(0, Math.floor(Number(durationSeconds) || 0))));
  return response.status(201).json({ id: Number(inserted.lastInsertRowid) });
}));

app.post('/api/friends', requireAuth, asyncHandler(async (request, response) => {
  const { friendUsername } = request.body ?? {};
  const normalized = String(friendUsername || '').trim().replace(/^@/, '').toLowerCase();
  const user = request.user;
  if (!/^[a-z0-9._-]{3,30}$/.test(normalized) || normalized === user.username) {
    return response.status(400).json({ error: 'Enter a registered username that is different from your own.' });
  }

  const createConnection = database.transaction(async () => {
    const friend = await getUser.get(normalized);
    if (!friend?.password_hash) return null;
    await insertFriendship.run(user.id, friend.id);
    await insertFriendship.run(friend.id, user.id);
    return friend;
  });

  const friend = await createConnection();
  if (!friend) return response.status(404).json({ error: 'No registered account has that username yet.' });
  return response.status(201).json({ username: friend.username, name: friend.display_name });
}));

const distDir = resolve(currentDir, '../dist');
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (request, response) => response.sendFile(resolve(distDir, 'index.html')));
}

const port = Number(process.env.PORT || process.env.API_PORT || 3002);
app.listen(port, '0.0.0.0', () => {
  console.log(`Pathwise listening on port ${port}`);
});
