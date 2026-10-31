import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { setRevocationChecker } from '../../identity-access/infrastructure/SessionRevocation.js';
import { roomFor, takeToken, verifySocketToken, cookieToken, buildMessagingGateway } from './Messaging.gateway.js';

const OID = (n) => String(n).padStart(24, 'a');

before(() => {
  process.env.JWTTOKENSECRET = process.env.JWTTOKENSECRET || 'test-secret';
  setRevocationChecker(async (id) => id === 'revoked-user');
});

describe('gateway helpers', () => {
  it('rooms are namespaced per partner', () => {
    assert.equal(roomFor('abc'), 'user:abc');
  });

  it('takeToken allows up to the limit per window, then blocks', () => {
    const bucket = [];
    for (let i = 0; i < 30; i++) assert.equal(takeToken(bucket, 1000 + i, 30), true);
    assert.equal(takeToken(bucket, 1000 + 30, 30), false);
    assert.equal(takeToken(bucket, 1000 + 60001, 30), true);
  });

  it('verifySocketToken accepts a live session', async () => {
    const token = jwt.sign({ id: 'partner-1' }, process.env.JWTTOKENSECRET);
    assert.equal(await verifySocketToken(token), 'partner-1');
  });

  it('verifySocketToken rejects garbage and revoked sessions', async () => {
    await assert.rejects(verifySocketToken('nope'), /token/i);
    const revoked = jwt.sign({ id: 'revoked-user' }, process.env.JWTTOKENSECRET);
    await assert.rejects(verifySocketToken(revoked), /revoked/i);
  });

  it('reads the jwt cookie as an auth fallback', async () => {
    assert.equal(cookieToken('jwt=abc.def.ghi; other=1'), 'abc.def.ghi');
    assert.equal(cookieToken('other=1; jwt=xyz'), 'xyz');
    assert.equal(cookieToken(null), null);
    assert.equal(cookieToken('other=1'), null);
    const fromCookie = cookieToken('jwt=' + jwt.sign({ id: 'partner-1' }, process.env.JWTTOKENSECRET));
    assert.equal(await verifySocketToken(fromCookie), 'partner-1');
  });
});

const fakeSocket = (partnerId) => {
  const handlers = {};
  return {
    data: { partnerId },
    handlers,
    joined: [],
    on(event, fn) { handlers[event] = fn; },
    join(room) { this.joined.push(room); },
    async fire(event, payload) {
      let replied;
      await handlers[event](payload, (v) => { replied = v; });
      return replied;
    },
  };
};

const gatewayDeps = (over = {}) => {
  const emitted = [];
  const rooms = { to: (id) => ({ emit: (ev, payload) => emitted.push({ to: id, ev, payload }) }) };
  return {
    emitted,
    rooms,
    direct: {
      async execute({ senderId, to, body }) {
        return { id: OID(9), senderId, recipientId: to, body, createdAt: new Date().toISOString() };
      },
    },
    read: { async execute() { return { read: true }; } },
    findMessage: async () => ({ senderId: OID(2) }),
    network: { async findNode() { return null; }, async findChildren() { return []; } },
    partners: {
      async updateOne() { return null; },
      findById() { return { select: () => ({ lean: async () => ({ name: 'Ada', surname: 'Obi' }) }) }; },
    },
    ...over,
  };
};

describe('messaging gateway', () => {
  it('sends through the shared use case and emits to both rooms', async () => {
    const deps = gatewayDeps();
    const { onConnection } = buildMessagingGateway(deps);
    const socket = fakeSocket(OID(1));
    await onConnection(null)(socket);
    const ack = await socket.fire('message:send', { to: OID(2), body: 'hello', clientId: 'c1' });
    assert.equal(ack.ok, true);
    assert.equal(ack.clientId, 'c1');
    const news = deps.emitted.filter((e) => e.ev === 'message:new');
    assert.deepEqual(news.map((e) => e.to).sort(), [OID(1), OID(2)].sort());
  });

  it('rejects strangers, empties and rate floods without touching the use case', async () => {
    let calls = 0;
    const deps = gatewayDeps({ direct: { async execute() { calls++; return { id: OID(9) }; } } });
    const { onConnection } = buildMessagingGateway(deps);
    const socket = fakeSocket(OID(1));
    await onConnection(null)(socket);
    assert.match((await socket.fire('message:send', { to: 'nope', body: 'hi' })).error, /recipient/i);
    assert.match((await socket.fire('message:send', { to: OID(2), body: '   ' })).error, /1–2000/);
    for (let i = 0; i < 30; i++) await socket.fire('message:send', { to: OID(2), body: `m${i}` });
    assert.match((await socket.fire('message:send', { to: OID(2), body: 'flood' })).error, /Slow down/);
    assert.equal(calls, 30);
  });

  it('relays typing and read receipts to the other side', async () => {    const deps = gatewayDeps();
    const { onConnection } = buildMessagingGateway(deps);
    const socket = fakeSocket(OID(1));
    await onConnection(null)(socket);
    await socket.fire('typing:start', { to: OID(2) });
    assert.deepEqual(deps.emitted.at(-1), { to: OID(2), ev: 'typing', payload: { from: OID(1), typing: true } });
    const ack = await socket.fire('message:read', { messageId: OID(7) });
    assert.equal(ack.ok, true);
    assert.deepEqual(deps.emitted.at(-1), { to: OID(2), ev: 'message:read', payload: { messageId: OID(7), readerId: OID(1) } });
  });
});

describe('offline push nudge', () => {
  const pushDeps = (live, send) => ({
    hasLiveSockets: () => live,
    push: {
      sender: { async send(payload) { return send(payload); } },
      subscriptions: {
        async listSubscriptions() { return [{ endpoint: 'e1' }]; },
        async pruneSubscription(id, endpoint) { pruned.push(endpoint); },
      },
    },
  });
  let pruned;
  const tick = () => new Promise((r) => setTimeout(r, 20));

  it('pushes when the recipient has no live socket', async () => {
    pruned = [];
    const sent = [];
    const deps = gatewayDeps(pushDeps(false, async (p) => { sent.push(p); return {}; }));
    const { onConnection } = buildMessagingGateway(deps);
    const socket = fakeSocket(OID(1));
    await onConnection(null)(socket);
    const ack = await socket.fire('message:send', { to: OID(2), body: 'hello there' });
    assert.equal(ack.ok, true);
    await tick();
    assert.equal(sent.length, 1);
    assert.match(sent[0].title, /Ada Obi/);
    assert.equal(sent[0].subscription.endpoint, 'e1');
    assert.deepEqual(pruned, []);
  });

  it('stays quiet when the recipient is live', async () => {
    pruned = [];
    let calls = 0;
    const deps = gatewayDeps(pushDeps(true, async () => { calls++; return {}; }));
    const { onConnection } = buildMessagingGateway(deps);
    const socket = fakeSocket(OID(1));
    await onConnection(null)(socket);
    await socket.fire('message:send', { to: OID(2), body: 'hi' });
    await tick();
    assert.equal(calls, 0);
  });

  it('prunes dead endpoints instead of failing', async () => {
    pruned = [];
    const deps = gatewayDeps(pushDeps(false, async () => ({ gone: true })));
    const { onConnection } = buildMessagingGateway(deps);
    const socket = fakeSocket(OID(1));
    await onConnection(null)(socket);
    const ack = await socket.fire('message:send', { to: OID(2), body: 'hi' });
    assert.equal(ack.ok, true);
    await tick();
    assert.deepEqual(pruned, ['e1']);
  });
});
