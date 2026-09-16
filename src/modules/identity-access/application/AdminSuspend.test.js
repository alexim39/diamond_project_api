import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SetSuspendUseCase } from './Admin.usecase.js';
import { PlatformStatsUseCase } from './Admin.usecase.js';
import { SigninUseCase } from './Signin.usecase.js';
import { GetCurrentPartnerUseCase } from './GetCurrentPartner.usecase.js';

const partner = (over = {}) => ({
  _id: 'p1', email: 'a@x.test', role: 'user', password: 'hashed',
  suspendedAt: null, suspendReason: null, ...over,
});

const fakePartners = (rows = []) => {
  const byId = new Map(rows.map((r) => [String(r._id), { ...r }]));
  return {
    byId,
    findById: async (id) => byId.get(String(id)) ?? null,
    findByEmail: async (email) => [...byId.values()].find((r) => r.email === email) ?? null,
    updateById: async (id, patch) => {
      const row = byId.get(String(id));
      if (!row) return null;
      Object.assign(row, patch);
      return { ...row };
    },
    countByRole: async (role) => [...byId.values()].filter((r) => String(r.role).toLowerCase() === role).length,
  };
};

const fakeHasher = { hash: async (p) => `hashed:${p}`, compare: async (p, h) => h === `hashed:${p}` };

describe('SetSuspendUseCase', () => {
  it('suspends with reason and unsuspends cleanly', async () => {
    const partners = fakePartners([partner()]);
    const uc = new SetSuspendUseCase({ partners });
    const off = await uc.execute({ requesterId: 'admin1', partnerId: 'p1', suspended: true, reason: 'Spam posts' });
    assert.equal(off.suspended, true);
    assert.equal(off.suspendReason, 'Spam posts');
    assert.ok(off.suspendedAt);
    assert.equal(off.password, undefined); // still safe-shaped

    const on = await uc.execute({ requesterId: 'admin1', partnerId: 'p1', suspended: false });
    assert.equal(on.suspended, false);
    assert.equal(on.suspendReason, null);
  });

  it('refuses self-suspension', async () => {
    const uc = new SetSuspendUseCase({ partners: fakePartners([partner({ _id: 'me' })]) });
    await assert.rejects(
      uc.execute({ requesterId: 'me', partnerId: 'me', suspended: true }),
      /own account/,
    );
  });

  it('refuses suspending the last admin', async () => {
    const partners = fakePartners([partner({ _id: 'a1', role: 'admin' }), partner({ _id: 'u2' })]);
    const uc = new SetSuspendUseCase({ partners });
    await assert.rejects(
      uc.execute({ requesterId: 'root', partnerId: 'a1', suspended: true }),
      /last admin/,
    );
  });

  it('allows suspending one admin while others remain', async () => {
    const partners = fakePartners([
      partner({ _id: 'a1', role: 'admin' }),
      partner({ _id: 'a2', role: 'admin' }),
    ]);
    const uc = new SetSuspendUseCase({ partners });
    const res = await uc.execute({ requesterId: 'a2', partnerId: 'a1', suspended: true });
    assert.equal(res.suspended, true);
  });

  it('404s unknown partners', async () => {
    const uc = new SetSuspendUseCase({ partners: fakePartners([]) });
    await assert.rejects(
      uc.execute({ requesterId: 'admin1', partnerId: 'ghost', suspended: true }),
      /not found/i,
    );
  });
});

describe('suspension enforcement', () => {
  it('v1 signin rejects suspended accounts', async () => {
    const uc = new SigninUseCase({
      partners: fakePartners([partner({ password: 'hashed:x', suspendedAt: new Date() })]),
      hasher: fakeHasher,
      sessions: { sign: () => 'tok' },
    });
    await assert.rejects(
      uc.execute({ email: 'a@x.test', password: 'x' }),
      /suspended/,
    );
  });

  it('v1 signin still passes clean accounts', async () => {
    const uc = new SigninUseCase({
      partners: fakePartners([partner()]),
      hasher: { compare: async () => true },
      sessions: { sign: () => 'tok' },
    });
    const res = await uc.execute({ email: 'a@x.test', password: 'x' });
    assert.equal(res.token, 'tok');
  });

  it('session check rejects suspended accounts', async () => {
    const uc = new GetCurrentPartnerUseCase({
      partners: fakePartners([partner({ suspendedAt: new Date() })]),
    });
    await assert.rejects(uc.execute({ partnerId: 'p1' }), /suspended/);
  });
});

describe('PlatformStatsUseCase', () => {
  it('returns the repo rollup untouched', async () => {
    const rollup = { total: 10, new7d: 2, new30d: 5, roles: { user: 7, leader: 1, g8: 1, admin: 1 }, suspended: 1 };
    const uc = new PlatformStatsUseCase({ partners: { platformStats: async () => rollup } });
    assert.deepEqual(await uc.execute(), rollup);
  });
});
