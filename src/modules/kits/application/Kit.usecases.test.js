import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ListKitsUseCase, ListAdminKitsUseCase, CreateKitUseCase, UpdateKitUseCase, DeleteKitUseCase,
} from './Kit.usecases.js';

const kit = (over = {}) => ({
  _id: 'k1', title: 'The Story', description: '', area: 'Opportunity',
  slides: [{ title: 'S1', body: 'B1' }], durationMin: 10, order: 0, active: true,
  ...over,
});

const fakeKits = (rows = []) => {
  const data = rows.map((r) => ({ ...r }));
  return {
    created: [],
    async find() { return data.map((r) => ({ ...r })); },
    async create(doc) {
      const row = { _id: `k${data.length + 1}`, ...doc };
      data.push(row);
      this.created.push(row);
      return { ...row, toObject: () => ({ ...row }) };
    },
    async findById(id) {
      const hit = data.find((r) => String(r._id) === String(id));
      if (!hit) return null;
      return {
        ...hit,
        async save() { Object.assign(hit, this); return hit; },
        toObject: () => ({ ...hit }),
      };
    },
    findByIdAndDelete(id) {
      const i = data.findIndex((r) => String(r._id) === String(id));
      const gone = i < 0 ? null : data.splice(i, 1)[0];
      return { lean: async () => (gone ? { ...gone } : null) };
    },
  };
};

// Minimal chainable query stub (find().sort().limit().lean()).
const chainable = (store) => {
  const origFind = store.find.bind(store);
  store.find = () => {
    const q = {
      sort() { return q; },
      limit() { return q; },
      lean: async () => (await origFind()).map((r) => ({ ...r })),
    };
    return q;
  };
  return store;
};

describe('ListKitsUseCase', () => {
  it('groups active kits by area, skipping empties', async () => {
    const uc = new ListKitsUseCase({ kits: chainable(fakeKits([kit(), kit({ _id: 'k2', area: 'Product' })])) });
    const res = await uc.execute();
    assert.equal(res.total, 2);
    assert.deepEqual(res.groups.map((g) => g.area), ['Opportunity', 'Product']);
    assert.equal(res.groups[0].items[0].slideCount, 1);
  });
});

describe('CreateKitUseCase', () => {
  it('validates title, area and slides', async () => {
    const uc = new CreateKitUseCase({ kits: fakeKits([]) });
    const res = await uc.execute({
      adminId: 'a1', title: 'New deck', area: 'Invite',
      slides: [{ title: 'S', body: 'B' }], durationMin: 5,
    });
    assert.equal(res.kit.title, 'New deck');
    assert.equal(res.kit.slideCount, 1);
    assert.equal(res.kit.source, 'manual');
    await assert.rejects(uc.execute({ title: 'x', slides: [{ title: 'S', body: 'B' }] }), /Title is required/);
    await assert.rejects(
      uc.execute({ title: 'Deck', area: 'Nope', slides: [{ title: 'S', body: 'B' }] }),
      /Invalid area/,
    );
    await assert.rejects(uc.execute({ title: 'Deck', slides: [] }), /at least one slide/);
  });

  it('creates file decks from an uploaded PDF url, never slides', async () => {
    const store = fakeKits([]);
    const uc = new CreateKitUseCase({ kits: store });
    const res = await uc.execute({
      adminId: 'a1', title: 'PDF deck', source: 'file', fileUrl: 'https://cdn/x/deck.pdf',
    });
    assert.equal(res.kit.source, 'file');
    assert.equal(res.kit.fileUrl, 'https://cdn/x/deck.pdf');
    assert.equal(res.kit.slideCount, 0);
    await assert.rejects(
      uc.execute({ title: 'PDF deck', source: 'file', fileUrl: '' }),
      /uploaded PDF url/,
    );
    await assert.rejects(
      uc.execute({ title: 'PDF deck', source: 'file', fileUrl: 'not-a-url' }),
      /uploaded PDF url/,
    );
    await assert.rejects(uc.execute({ title: 'PDF deck', source: 'dvd' }), /Invalid source/);
  });
});

describe('UpdateKitUseCase', () => {
  it('patches fields and re-validates replaced slides', async () => {
    const uc = new UpdateKitUseCase({ kits: fakeKits([kit()]) });
    const res = await uc.execute({ kitId: 'k1', patch: { title: 'Renamed', active: false } });
    assert.equal(res.kit.title, 'Renamed');
    assert.equal(res.kit.active, false);
    await assert.rejects(uc.execute({ kitId: 'ghost', patch: { title: 'x' } }), /not found/i);
    await assert.rejects(uc.execute({ kitId: 'k1', patch: { slides: [] } }), /at least one slide/);
  });

  it('switching kinds resets the other side and enforces the new side', async () => {
    const uc = new UpdateKitUseCase({ kits: fakeKits([kit()]) });
    const toFile = await uc.execute({ kitId: 'k1', patch: { source: 'file', fileUrl: 'https://cdn/x/d.pdf' } });
    assert.equal(toFile.kit.source, 'file');
    assert.equal(toFile.kit.slideCount, 0);
    assert.equal(toFile.replacedFileUrl, null);
    await assert.rejects(uc.execute({ kitId: 'k1', patch: { source: 'manual' } }), /at least one slide/);
    const back = await uc.execute({ kitId: 'k1', patch: { source: 'manual', slides: [{ title: 'S', body: 'B' }] } });
    assert.equal(back.kit.source, 'manual');
    assert.equal(back.kit.fileUrl, '');
    assert.equal(back.replacedFileUrl, 'https://cdn/x/d.pdf');
  });

  it('replacing the PDF reports the old url, untouched urls report null', async () => {
    const uc = new UpdateKitUseCase({
      kits: fakeKits([kit({ source: 'file', fileUrl: 'https://cdn/x/old.pdf', slides: [] })]),
    });
    const swapped = await uc.execute({ kitId: 'k1', patch: { fileUrl: 'https://cdn/x/new.pdf' } });
    assert.equal(swapped.replacedFileUrl, 'https://cdn/x/old.pdf');
    const same = await uc.execute({ kitId: 'k1', patch: { title: 'Touch' } });
    assert.equal(same.replacedFileUrl, null);
  });
});

describe('DeleteKitUseCase', () => {
  it('deletes, returns the file url for asset cleanup, and 404s unknown ids', async () => {
    const uc = new DeleteKitUseCase({ kits: fakeKits([kit()]) });
    assert.deepEqual(await uc.execute({ kitId: 'k1' }), { deleted: true, id: 'k1', fileUrl: null });
    await assert.rejects(uc.execute({ kitId: 'k1' }), /not found/i);
  });
});

describe('ListAdminKitsUseCase', () => {
  it('returns everything newest-bounded', async () => {
    const uc = new ListAdminKitsUseCase({ kits: chainable(fakeKits([kit(), kit({ _id: 'k2', active: false })])) });
    const res = await uc.execute({});
    assert.equal(res.total, 2);
  });
});
