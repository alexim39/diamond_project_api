import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import { errorMiddleware } from '../../../shared/http/errorMiddleware.js';
import { setRevocationChecker } from '../../identity-access/infrastructure/SessionRevocation.js';
import { buildGroupRouter } from './Group.routes.js';

before(() => {
  process.env.JWTTOKENSECRET = process.env.JWTTOKENSECRET || 'test-secret-group-routes';
  setRevocationChecker(async () => false);
});

const listen = (app) =>
  new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });

const close = (server) =>
  new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

const OID = (n) => String(n).padStart(24, 'b');

/** Minimal in-memory group store — throws if an unexpected method is touched. */
const fakeGroups = () => {
  const members = new Map([[`${OID(1)}:${OID(9)}`, 'admin']]);
  return {
    async createGroup(input) {
      return { id: OID(1), ...input, createdBy: input.createdBy };
    },
    async getGroup(id) {
      return String(id) === OID(1)
        ? { id: OID(1), name: 'Hustlers', joinPolicy: 'approval', createdBy: OID(9), pinnedMessageId: null }
        : null;
    },
    async memberRole(gid, pid) {
      return members.get(`${gid}:${pid}`) ?? null;
    },
    async membersWithProfiles(gid) {
      return [...members.entries()]
        .filter(([k]) => k.startsWith(`${gid}:`))
        .map(([k, role]) => ({ id: k.split(':')[1], role, muted: false }));
    },
    async listRequests() { return []; },
    async isMember(gid, pid) { return members.has(`${gid}:${pid}`); },
    async isBanned() { return false; },
    async memberCount() { return 1; },
    async requestJoin(gid, pid) {
      members.set(`${gid}:${pid}:requested`, 'pending');
      return { created: true };
    },
    async findAnyRequest() { return null; },
    async listBans() { return [{ partnerId: OID(2), reason: 'spam', name: 'Spammer' }]; },
  };
};

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(buildGroupRouter({
    groups: fakeGroups(),
    stored: { list: async () => [] },
    notify: { execute: async () => ({}) },
    partners: { findById: async () => ({ _id: 'stub' }), find: async () => [] },
    audit: { record: () => {} },
  }));
  app.use(errorMiddleware);
  return app;
};

const token = (n = 9) => jwt.sign({ id: OID(n) }, process.env.JWTTOKENSECRET);

describe('group routes', () => {
  it('requires auth under /groups (401 without token)', async (t) => {
    const app = buildApp();
    const server = await listen(app);
    t.after(() => close(server));
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/groups/mine`);
    assert.equal(res.status, 401);
  });

  it('rejects malformed ids before any store touch', async (t) => {
    const app = buildApp();
    const server = await listen(app);
    t.after(() => close(server));
    const { port } = server.address();
    const auth = { authorization: `Bearer ${token()}` };
    const badGet = await fetch(`http://127.0.0.1:${port}/groups/nope`, { headers: auth });
    assert.equal(badGet.status, 400);
    const badJoin = await fetch(`http://127.0.0.1:${port}/groups/nope/join`, { method: 'POST', headers: auth });
    assert.equal(badJoin.status, 400);
  });

  it('creates a group and serves it back to members only', async (t) => {
    const app = buildApp();
    const server = await listen(app);
    t.after(() => close(server));
    const { port } = server.address();
    const headers = { authorization: `Bearer ${token()}`, 'content-type': 'application/json' };

    const created = await fetch(`http://127.0.0.1:${port}/groups/`, {
      method: 'POST', headers, body: JSON.stringify({ name: 'Hustlers' }),
    });
    assert.equal(created.status, 201);
    const createdBody = await created.json();
    assert.equal(createdBody.data.name, 'Hustlers');

    // Strangers get 404 (never leak existence); members get the group.
    const stranger = await fetch(`http://127.0.0.1:${port}/groups/${OID(1)}`, {
      headers: { authorization: `Bearer ${token(2)}` },
    });
    assert.equal(stranger.status, 404);
    const member = await fetch(`http://127.0.0.1:${port}/groups/${OID(1)}`, { headers });
    assert.equal(member.status, 200);
  });

  it('queues join requests for approval groups', async (t) => {
    const app = buildApp();
    const server = await listen(app);
    t.after(() => close(server));
    const { port } = server.address();
    const outsider = { authorization: `Bearer ${token(3)}` };
    const res = await fetch(`http://127.0.0.1:${port}/groups/${OID(1)}/join`, { method: 'POST', headers: outsider });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.pending, true);
  });

  it('serves the ban list to admins, hides it from strangers', async (t) => {
    const app = buildApp();
    const server = await listen(app);
    t.after(() => close(server));
    const { port } = server.address();
    const admin = await fetch(`http://127.0.0.1:${port}/groups/${OID(1)}/bans`, {
      headers: { authorization: `Bearer ${token()}` },
    });
    assert.equal(admin.status, 200);
    const bans = await admin.json();
    assert.equal(bans.data.length, 1);
    const stranger = await fetch(`http://127.0.0.1:${port}/groups/${OID(1)}/bans`, {
      headers: { authorization: `Bearer ${token(2)}` },
    });
    assert.equal(stranger.status, 404);
  });
});
