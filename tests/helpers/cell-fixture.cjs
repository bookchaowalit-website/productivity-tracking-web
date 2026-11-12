// In-memory stand-in for the tracking cell client (`@/lib/tracking-cell`, SPEC-003).
// It follows the cell's contract (bookchaowalit/productivity-tracking-api): shared items, one row per user
// and item, 404 for another user's item, 409 for a duplicate, the activity row in the same transaction
// (a failure rolls the whole write back and answers 500), and `meta` for the web's analytics.
const CATEGORIES = ['ANIME', 'MANGA', 'MOVIE', 'TV_SHOW', 'BOOK', 'WEBSITE', 'PODCAST', 'GAME', 'OTHER'];
const UPDATABLE = ['status', 'progress', 'rating', 'isFavorite', 'priority', 'startDate', 'finishDate'];

const same = (a, b) => {
  const value = (v) => (v instanceof Date ? v.getTime() : typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) ? Date.parse(v) : v ?? null);
  return value(a) === value(b);
};

// getDb returns the test's current db object; fail(name) throws when a test asked that step to fail;
// writes (optional) records ['create'|'update'|'delete', userId, itemId].
function makeCellFixture({ getDb, fail = () => {}, writes = () => [] }) {
  const find = (userId, itemId) => getDb().trackings.find((t) => t.userId === userId && t.itemId === itemId);
  const transaction = (work) => {
    const db = getDb();
    const before = { items: db.items.map((i) => ({ ...i })), trackings: db.trackings.map((t) => ({ ...t })), logs: [...db.logs] };
    const recorded = writes().length;
    try {
      return work(db);
    } catch {
      Object.assign(db, before);
      writes().splice(recorded);
      return { status: 500, body: { error: 'internal' } };
    }
  };
  const log = (db, userId, action, item, details) => {
    fail('activityLog.create');
    db.logs.push({ userId, action, itemTitle: item.title, category: item.category, ...(details ? { details } : {}) });
  };

  return {
    async list(userId) {
      const db = getDb();
      const body = db.trackings.filter((t) => t.userId === userId).map((t) => {
        const item = db.items.find((i) => i.id === t.itemId);
        return { ...item, userTrackings: [{ ...t }], _count: { userTrackings: db.trackings.filter((x) => x.itemId === item.id).length } };
      });
      return { status: 200, body };
    },
    async add(userId, body) {
      if (!CATEGORIES.includes(body.category)) return { status: 400, body: { error: 'invalid_field' } };
      return transaction((db) => {
        const existing = db.items.find((i) => i.category === body.category && i.title.toLowerCase() === body.title.toLowerCase());
        let item = existing;
        if (existing) {
          if (find(userId, existing.id)) return { status: 409, body: { error: 'already_tracked' } };
          fail('userTracking.create');
        } else {
          fail('trackingItem.create');
          item = { id: `item-${db.items.length + 1}`, title: body.title, category: body.category };
          db.items.push(item);
        }
        const tracking = {
          userId, itemId: item.id, status: body.status || 'PLAN_TO_WATCH', rating: body.rating ?? null,
          progress: body.progress ?? null, priority: body.priority ?? null, isFavorite: Boolean(body.isFavorite),
        };
        db.trackings.push(tracking);
        writes().push(['create', userId, item.id]);
        log(db, userId, existing ? 'added_to_list' : 'created_item', item);
        return { status: 201, body: { ...tracking, item, meta: { source: existing ? 'existing_item' : 'new_item', category: item.category, status: tracking.status } } };
      });
    },
    async update(userId, itemId, body) {
      return transaction((db) => {
        const tracking = find(userId, itemId);
        if (!tracking) return { status: 404, body: { error: 'not_found' } };
        fail('userTracking.update');
        const before = { ...tracking };
        if (body.status) tracking.status = body.status;
        for (const field of ['rating', 'progress', 'priority', 'startDate', 'finishDate']) {
          if (field in body) tracking[field] = body[field] ?? null;
        }
        if (body.isFavorite !== undefined && body.isFavorite !== null) tracking.isFavorite = Boolean(body.isFavorite);
        writes().push(['update', userId, itemId]);
        const item = db.items.find((i) => i.id === itemId);
        const fieldsChanged = UPDATABLE.filter((f) => !same(before[f], tracking[f]));
        if (body.status === 'COMPLETED' && before.status !== 'COMPLETED') log(db, userId, 'completed', item, `Rated ${body.rating || 'unrated'}`);
        else if (body.rating && body.rating !== before.rating) log(db, userId, 'rated', item, `Rated ${body.rating}/10`);
        return {
          status: 200,
          body: { ...tracking, meta: { fields_changed: fieldsChanged, completed_now: tracking.status === 'COMPLETED' && before.status !== 'COMPLETED', category: item.category, status: tracking.status } },
        };
      });
    },
    async remove(userId, itemId) {
      return transaction((db) => {
        const tracking = find(userId, itemId);
        if (!tracking) return { status: 404, body: { error: 'not_found' } };
        fail('userTracking.delete');
        db.trackings = db.trackings.filter((t) => t !== tracking);
        writes().push(['delete', userId, itemId]);
        const item = db.items.find((i) => i.id === itemId);
        log(db, userId, 'removed_from_list', item);
        return { status: 200, body: { message: 'Tracking item removed successfully', meta: { category: item.category } } };
      });
    },
  };
}

module.exports = { makeCellFixture };
