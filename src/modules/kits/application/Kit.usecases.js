import { NotFoundException, ValidationException } from '../../../shared/domain/AppError.js';
import { KIT_AREAS, createSlides } from '../domain/Kit.js';
import { KitModel } from '../infrastructure/Kit.mongo.js';

const oid = (v) => String(v);
const shaped = (t) => t ? {
  id: oid(t._id ?? t.id),
  title: t.title,
  description: t.description ?? '',
  area: t.area,
  source: t.source ?? 'manual',
  fileUrl: t.fileUrl ?? '',
  slides: (t.slides ?? []).map((s) => ({
    title: s.title,
    body: s.body,
    imageUrl: s.imageUrl ?? '',
    note: s.note ?? '',
  })),
  slideCount: (t.slides ?? []).length,
  durationMin: t.durationMin ?? 10,
  order: t.order ?? 0,
  active: t.active !== false,
  createdAt: t.createdAt ?? null,
  updatedAt: t.updatedAt ?? null,
} : null;

const cleanTitle = (title) => {
  const t = String(title ?? '').trim().slice(0, 120);
  if (t.length < 3) throw new ValidationException('Title is required');
  return t;
};

const cleanArea = (area) => {
  if (!KIT_AREAS.includes(area)) throw new ValidationException('Invalid area');
  return area;
};

/** Member list — active kits grouped by area in fixed order. */
export class ListKitsUseCase {
  /** @param {{kits}} deps */
  constructor({ kits } = {}) {
    this.kits = kits ?? KitModel;
  }

  async execute() {
    const rows = await this.kits.find({ active: true }).sort({ area: 1, order: 1, createdAt: 1 }).limit(200).lean();
    const groups = KIT_AREAS.map((area) => ({
      area,
      items: (rows ?? []).filter((r) => (r.area ?? 'Opportunity') === area).map(shaped),
    })).filter((g) => g.items.length > 0);
    return { groups, total: (rows ?? []).length };
  }
}

/** Admin list — everything with status, newest first. */
export class ListAdminKitsUseCase {
  /** @param {{kits}} deps */
  constructor({ kits } = {}) {
    this.kits = kits ?? KitModel;
  }

  async execute({ limit = 100 } = {}) {
    const lim = Math.min(Math.max(Number(limit) || 100, 1), 200);
    const rows = await this.kits.find({}).sort({ createdAt: -1 }).limit(lim).lean();
    return { items: (rows ?? []).map(shaped), total: (rows ?? []).length };
  }
}

const cleanFileUrl = (value) => {
  const url = String(value ?? '').trim().slice(0, 1000);
  if (!/^https?:\/\//i.test(url)) throw new ValidationException('A file deck needs its uploaded PDF url');
  return url;
};

/** Admin create — manual decks carry validated slides, file decks a PDF url. */
export class CreateKitUseCase {
  /** @param {{kits}} deps */
  constructor({ kits } = {}) {
    this.kits = kits ?? KitModel;
  }

  async execute({ adminId, title, description = '', area = 'Opportunity', source = 'manual', slides, fileUrl = '', durationMin = 10, order = 0, active = true }) {
    if (source !== 'manual' && source !== 'file') throw new ValidationException('Invalid source');
    const doc = await this.kits.create({
      title: cleanTitle(title),
      description: String(description ?? '').trim().slice(0, 500),
      area: cleanArea(area),
      source,
      fileUrl: source === 'file' ? cleanFileUrl(fileUrl) : '',
      slides: source === 'file' ? [] : createSlides(slides),
      durationMin: Math.min(Math.max(Number(durationMin) || 10, 1), 120),
      order: Math.min(Math.max(Number(order) || 0, 0), 10000),
      active: active !== false,
      createdBy: adminId ?? null,
    });
    return { kit: shaped(doc.toObject?.() ?? doc) };
  }
}

/** Admin update — slides re-validated when replaced; everything else patched. */
export class UpdateKitUseCase {
  /** @param {{kits}} deps */
  constructor({ kits } = {}) {
    this.kits = kits ?? KitModel;
  }

  async execute({ kitId, patch = {} }) {
    const doc = await this.kits.findById(kitId);
    if (!doc) throw new NotFoundException('Kit not found');
    const previousFile = typeof doc.fileUrl === 'string' && doc.fileUrl ? doc.fileUrl : null;
    if (patch.title !== undefined) doc.title = cleanTitle(patch.title);
    if (patch.description !== undefined) doc.description = String(patch.description ?? '').trim().slice(0, 500);
    if (patch.area !== undefined) doc.area = cleanArea(patch.area);
    if (patch.source !== undefined) {
      if (patch.source !== 'manual' && patch.source !== 'file') throw new ValidationException('Invalid source');
      doc.source = patch.source;
      // Switching kinds resets the other side so a deck is never both.
      if (patch.source === 'file') doc.slides = [];
      else doc.fileUrl = '';
    }
    const effectiveSource = doc.source ?? 'manual';
    if (patch.fileUrl !== undefined) doc.fileUrl = String(patch.fileUrl ?? '').trim().slice(0, 1000);
    if (effectiveSource === 'file') {
      if (!/^https?:\/\//i.test(String(doc.fileUrl ?? ''))) {
        throw new ValidationException('A file deck needs its uploaded PDF url');
      }
      doc.slides = [];
    } else {
      doc.fileUrl = '';
      if (patch.slides !== undefined) doc.slides = createSlides(patch.slides);
      else if (!Array.isArray(doc.slides) || doc.slides.length === 0) {
        throw new ValidationException('A manual deck needs at least one slide');
      }
    }
    if (patch.durationMin !== undefined) {
      doc.durationMin = Math.min(Math.max(Number(patch.durationMin) || 10, 1), 120);
    }
    if (patch.order !== undefined) doc.order = Math.min(Math.max(Number(patch.order) || 0, 0), 10000);
    if (patch.active !== undefined) doc.active = patch.active !== false && patch.active !== 'false';
    await doc.save();
    const saved = shaped(doc.toObject?.() ?? doc);
    // Replaced PDFs must not linger in cloud storage — the route destroys
    // the previous asset best-effort; the row is already correct regardless.
    const currentFile = saved.fileUrl || null;
    return {
      kit: saved,
      replacedFileUrl: previousFile && previousFile !== currentFile ? previousFile : null,
    };
  }
}

/** Admin delete. */
export class DeleteKitUseCase {
  /** @param {{kits}} deps */
  constructor({ kits } = {}) {
    this.kits = kits ?? KitModel;
  }

  async execute({ kitId }) {
    const doc = await this.kits.findByIdAndDelete(kitId).lean();
    if (!doc) throw new NotFoundException('Kit not found');
    return { deleted: true, id: String(kitId), fileUrl: doc.fileUrl ?? null };
  }
}
