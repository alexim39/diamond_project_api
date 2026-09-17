import test from 'node:test';
import assert from 'node:assert/strict';

const domain = await import('../domain/Broadcast.js');
const {
  resolveAudience, splitChannels, EstimateAudienceUseCase,
  ScheduleCampaignUseCase, RunBroadcastDueUseCase, GetCampaignUseCase,
} = await import('./Broadcast.campaign.js');

const valMatches = (actual, cond) => {
  if (cond && typeof cond === 'object' && !(cond instanceof RegExp) && !(cond instanceof Date)) {
    if ('$in' in cond) return cond.$in.map(String).includes(String(actual));
    if ('$gte' in cond && !(actual >= cond.$gte)) return false;
    if ('$lte' in cond && !(actual <= cond.$lte)) return false;
    if ('$ne' in cond && !(actual !== cond.$ne)) return false;
    return true;
  }
  if (cond instanceof RegExp) return cond.test(String(actual ?? ''));
  if (cond === null) return actual === null || actual === undefined;
  return String(actual) === String(cond);
};

const fakePartners = (seed = []) => ({
  find: (filter) => {
    const found = seed.filter((r) => Object.entries(filter ?? {}).every(([k, v]) => valMatches(r[k], v)));
    const chain = {
      sort: () => chain,
      limit: (n) => ({ lean: async () => found.slice(0, n).map((r) => ({ ...r })) }),
      lean: async () => found.map((r) => ({ ...r })),
    };
    return { select: () => chain };
  },
});

const m = (over = {}) => ({
  _id: `u${Math.random().toString(36).slice(2, 8)}`,
  name: 'Ada', surname: 'T', email: 'ada@x.test', phone: '08031234567',
  username: 'adat', role: 'User', status: true, suspendedAt: null,
  createdAt: new Date('2024-01-01'),
  ...over,
});

const fakePrefs = (rows = []) => ({
  find: () => ({ lean: async () => rows.map((r) => ({ ...r })) }),
});

const prefsRow = (id, over = {}) => ({
  partnerId: id,
  channels: {
    system: { inApp: true, email: true, sms: true, push: false },
    marketing: { inApp: true, email: true, sms: true, push: false },
    ...(over.channels ?? {}),
  },
  emailDigest: over.emailDigest ?? 'immediate',
});

const fakeBroadcasts = () => {
  const rows = new Map();
  return {
    rows,
    create: async (doc) => {
      const row = { _id: `b${rows.size + 1}`, ...doc };
      rows.set(row._id, row);
      return { ...row };
    },
    findOneAndUpdate: (filter, update) => {
      const row = [...rows.values()].find((r) => Object.entries(filter ?? {}).every(([k, v]) => {
        if (k === 'sendAt' && v && typeof v === 'object' && '$lte' in v) return new Date(r.sendAt) <= new Date(v.$lte);
        return String(r[k]) === String(v);
      }));
      if (!row) return { lean: async () => null };
      Object.assign(row, update.$set ?? {});
      return { lean: async () => ({ ...row }) };
    },
    updateOne: async (filter, update) => {
      const row = [...rows.values()].find((r) => String(r._id) === String(filter._id));
      if (row) Object.assign(row, update.$set ?? {});
      return { modifiedCount: row ? 1 : 0 };
    },
    findById: (id) => ({ lean: async () => {
      const r = rows.get(String(id));
      return r ? { ...r } : null;
    } }),
  };
};

const drivers = (over = {}) => ({
  notify: { calls: [], execute: async function (c) { this.calls.push(c); return {}; } },
  mailed: [],
  sent: [],
  ...over,
});
const wireDrivers = (d) => ({
  notify: d.notify,
  mail: async (to, subject, html) => { d.mailed.push({ to, subject, html }); return { sent: true }; },
  sms: { send: async ({ to, title, body }) => { d.sent.push({ to, title, body }); return { providerId: 'x' }; } },
});

// --- domain ---------------------------------------------------------------

test('campaign input defaults + validation', () => {
  const c = domain.createCampaignInput({ title: 'Hello all', body: 'Maintenance tonight at 10pm' });
  assert.deepEqual(c.channels, { inApp: true, email: false, sms: false });
  assert.equal(c.kind, 'system');
  assert.equal(c.audience.mode, 'all');
  assert.equal(c.subject, 'Hello all');
  assert.ok(c.smsBody.length <= domain.BROADCAST_SMS_MAX);
  assert.throws(() => domain.createCampaignInput({
    title: 'Hello all', body: 'Maintenance tonight', channels: {},
  }), /at least one channel/);
  assert.throws(() => domain.createCampaignInput({
    title: 'Hello all', body: 'Maintenance tonight', audience: { mode: 'picked', ids: [] },
  }), /at least one member/);
});

test('estimate math honours the gateway unit cost', () => {
  assert.equal(domain.estimateSmsSpend(100, 'x'.repeat(160)), 100 * 1 * 6.49);
  assert.equal(domain.estimateSmsSpend(100, 'x'.repeat(161)), 100 * 2 * 6.49);
});

// --- audience ---------------------------------------------------------------

test('resolveAudience excludes suspended members and honours cap', async () => {
  const partners = fakePartners([
    m({ _id: 'u1' }),
    m({ _id: 'u2', suspendedAt: new Date() }),
  ]);
  const { members, capped, total } = await resolveAudience({ partners }, { mode: 'all' }, 10);
  assert.deepEqual(members.map((x) => x.id), ['u1']);
  assert.equal(capped, false);
  assert.equal(total, 1);
});

test('resolveAudience segments by role and picked ids', async () => {
  const partners = fakePartners([
    m({ _id: 'u1', role: 'admin' }),
    m({ _id: 'u2', role: 'User' }),
  ]);
  const seg = await resolveAudience({ partners }, { mode: 'segment', segment: { role: 'admin', excludeSuspended: true } }, 10);
  assert.deepEqual(seg.members.map((x) => x.id), ['u1']);
  const picked = await resolveAudience({ partners }, { mode: 'picked', ids: ['u2'] }, 10);
  assert.deepEqual(picked.members.map((x) => x.id), ['u2']);
});

// --- estimate + opt-out -------------------------------------------------------

test('marketing honours opt-outs, system reaches everyone', async () => {
  const a = m({ _id: 'u1' });
  const b = m({ _id: 'u2', email: 'b@x.test', phone: '08037654321' });
  const partners = fakePartners([a, b]);
  const prefs = fakePrefs([
    prefsRow('u1'),
    prefsRow('u2', { channels: { marketing: { inApp: false, email: false, sms: false, push: false } }, emailDigest: 'off' }),
  ]);
  const est = new EstimateAudienceUseCase({ partners, prefs });
  const mk = await est.execute({
    audience: { mode: 'all' },
    channels: { inApp: true, email: true, sms: true },
    kind: 'marketing',
    smsBody: 'Hi there',
  });
  assert.equal(mk.total, 2);
  assert.equal(mk.inApp, 1);
  assert.equal(mk.email, 1);
  assert.equal(mk.sms, 1);
  const sys = await est.execute({
    audience: { mode: 'all' },
    channels: { inApp: true, email: true, sms: true },
    kind: 'system',
    smsBody: 'Hi there',
  });
  assert.equal(sys.email, 2);
  assert.equal(sys.sms, 2);
  assert.ok(sys.estimatedSmsSpend > 0);
});

// --- schedule + run ------------------------------------------------------------

test('scheduled campaigns fire when due, never twice, never early', async () => {
  const broadcasts = fakeBroadcasts();
  const sch = new ScheduleCampaignUseCase({ broadcasts });
  const now = await sch.execute({
    createdBy: 'admin1',
    input: { title: 'Hello all', body: 'Maintenance tonight', channels: { inApp: true } },
  });
  assert.equal(now.status, 'scheduled');
  const future = await sch.execute({
    createdBy: 'admin1',
    input: {
      title: 'Hello all', body: 'Future news here', channels: { inApp: true },
      sendAt: new Date(Date.now() + 3600000).toISOString(),
    },
  });
  assert.ok(new Date(future.sendAt).getTime() > Date.now());

  const d = drivers();
  const run = new RunBroadcastDueUseCase({
    broadcasts,
    partners: fakePartners([m({ _id: 'u1' })]),
    prefs: fakePrefs([prefsRow('u1')]),
    ...wireDrivers(d),
  });
  const first = await run.execute({});
  assert.equal(first.checked, 1);
  assert.equal(first.sent, 1);
  assert.equal(d.notify.calls.length, 1);
  assert.ok(d.notify.calls[0].key.startsWith('broadcast:'));
  const row = [...broadcasts.rows.values()].find((r) => String(r._id) === now.id);
  assert.equal(row.status, 'sent');
  assert.equal(row.stats.inApp.sent, 1);
  const second = await run.execute({});
  assert.equal(second.checked, 0); // future row untouched, sent row done
});

test('run fans out email + sms with per-channel stats, skips members without contact', async () => {
  const broadcasts = fakeBroadcasts();
  await new ScheduleCampaignUseCase({ broadcasts }).execute({
    createdBy: 'admin1',
    input: {
      title: 'Big news here', body: 'Read all about it\nin the app today',
      link: '/dashboard/community',
      subject: 'Big news', smsBody: 'Big news — open the app',
      channels: { inApp: false, email: true, sms: true }, kind: 'system',
    },
  });
  const d = drivers();
  const run = new RunBroadcastDueUseCase({
    broadcasts,
    partners: fakePartners([
      m({ _id: 'u1' }),
      m({ _id: 'u2', email: null, phone: null }),
    ]),
    prefs: fakePrefs([]),
    appBaseUrl: 'https://c21fg.online',
    ...wireDrivers(d),
  });
  await run.execute({});
  assert.equal(d.mailed.length, 1);
  assert.equal(d.sent.length, 1);
  // Email arrives as real paragraphs with an absolute-URL CTA button.
  const html = d.mailed[0].html;
  assert.match(html, /<p style="margin:0 0 1em;">Read all about it<br>in the app today<\/p>/);
  assert.match(html, /href="https:\/\/c21fg\.online\/dashboard\/community"/);
  assert.match(html, /background-color:#a97f2c/);
  // SMS arrives multi-line, GSM-7 (no em-dash) — shaped by the shared
  // smsBody() choke point inside the sender.
  const { smsBody } = await import('../../notifications/domain/Delivery.js');
  const shaped = smsBody(d.sent[0].title, d.sent[0].body);
  assert.match(shaped, /\n/);
  assert.ok(!/[—–‘’“”]/.test(shaped));
  const row = [...broadcasts.rows.values()][0];
  assert.equal(row.stats.email.sent, 1);
  assert.equal(row.stats.sms.sent, 1);
  assert.ok(row.stats.estimatedSmsSpend > 0);
});

test('get campaign validates id and reports missing rows', async () => {
  const uc = new GetCampaignUseCase({ broadcasts: fakeBroadcasts() });
  await assert.rejects(uc.execute({ id: 'nope' }), /Invalid broadcast id/);
  await assert.rejects(uc.execute({ id: '0123456789abcdef01234567' }), /not found/);
});
