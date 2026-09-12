import {
  ConflictException, ForbiddenException, NotFoundException, ValidationException,
} from '../../../shared/domain/AppError.js';
import { LEVELS, LEVEL_LABELS, RANK, resolveProgression } from '../domain/Progression.levels.js';
import { PROGRESSION_EVENTS, promotedPayload } from '../domain/ProgressionEvents.js';
import { adminBootstrapEmails, lenientRole } from '../../identity-access/domain/PartnerRole.js';
import { collectDownlineIds } from '../../network/infrastructure/Network.mongo.repository.js';

const DAY = 86400000;

/**
 * Live signals from source aggregates (never stored).
 * Bounded: downline BFS is depth- + cap-limited like everywhere else.
 */
export async function assembleSignals(partnerId, { network, orders, progress }, now = new Date()) {
  const end = new Date(now);
  const start30 = new Date(end.getTime() - 30 * DAY);
  const start60 = new Date(end.getTime() - 60 * DAY);
  const [{ ids: downline }] = await Promise.all([collectDownlineIds(network, partnerId)]);
  const [recruits, cur, prev, active, levels] = await Promise.all([
    network.countChildren(partnerId),
    orders.volumeBetween(partnerId, start30, end),
    orders.volumeBetween(partnerId, start60, start30),
    orders.activeMemberCount(downline, start30, end),
    progress.levelsFor(downline.slice(0, 2000)),
  ]);
  const counts = {};
  for (const lvl of Object.values(levels)) counts[lvl] = (counts[lvl] ?? 0) + 1;
  return {
    recruits,
    activeDownline: active,
    downlineTotal: downline.length,
    maintenanceOk: cur.total > 0 && prev.total > 0,
    kingsmen: (counts.kingsman ?? 0) + (counts.ecl ?? 0) + (counts.cell_leader ?? 0) + (counts.g_leader ?? 0) + (counts.g8 ?? 0),
    ecls: (counts.ecl ?? 0) + (counts.cell_leader ?? 0) + (counts.g_leader ?? 0) + (counts.g8 ?? 0),
  };
}

const STAMPS = ['ipo', 'qsg', 'smo', 'fullTime', 'office', 'onboardingSession', 'qualifiedConfirmed', 'appointment'];

const toMilestones = (doc = {}) => {
  const m = {};
  for (const k of STAMPS) if (doc[k] !== undefined) m[k] = doc[k];
  if (doc.accounts !== undefined) m.accounts = doc.accounts;
  if (doc.officeAddress !== undefined) m.officeAddress = doc.officeAddress;
  if (doc.g8Request !== undefined) m.g8Request = doc.g8Request;
  if (doc.appointedBy !== undefined) m.appointedBy = doc.appointedBy;
  return m;
};

/** Parse + validate a milestone patch (keys outside the whitelist are dropped). */
export const buildMilestonePatch = (input = {}) => {
  const patch = {};
  for (const k of STAMPS) {
    if (input[k] === undefined) continue;
    const done = input[k]?.done ?? input[k];
    if (typeof done !== 'boolean') throw new ValidationException(`Invalid ${k}`);
    patch[k] = { done, at: done ? new Date() : null };
  }
  if (input.accounts !== undefined) {
    const count = Number(input.accounts?.count ?? input.accounts);
    if (!Number.isInteger(count) || count < 0 || count > 1000) throw new ValidationException('Invalid accounts');
    patch['accounts.count'] = count;
  }
  if (input.officeAddress !== undefined) {
    patch.officeAddress = String(input.officeAddress ?? '').slice(0, 200);
  }
  if (input.g8Request !== undefined) {
    const status = input.g8Request?.status ?? input.g8Request;
    if (!['none', 'submitted', 'approved'].includes(status)) throw new ValidationException('Invalid g8Request');
    patch['g8Request.status'] = status;
    patch['g8Request.at'] = status === 'none' ? null : new Date();
  }
  if (Object.keys(patch).length === 0) throw new ValidationException('Nothing to update');
  return patch;
};

/** My journey: derived level, next gate, promotion detection (recognition hook). */
export class GetMyProgressionUseCase {
  /** @param {{progress, network, orders, recognition, events?}} deps (recognition optional — auto-posts promotions; events optional — promotion fan-out) */
  constructor({ progress, network, orders, recognition, events = null }) {
    Object.assign(this, { progress, network, orders, recognition, events });
  }

  async execute({ partnerId, now = new Date() }) {
    const doc = await this.progress.ensure(partnerId);
    const signals = await assembleSignals(partnerId, this, now);
    const resolved = resolveProgression(signals, toMilestones(doc), doc.level ?? 'partner');
    let promoted = null;
    if (RANK(resolved.level) > RANK(doc.level ?? 'partner')) {
      const from = doc.level ?? 'partner';
      await this.progress.setLevel(partnerId, resolved.level);
      promoted = { from, to: resolved.level };
      // Community recognition — best-effort, never fails the read.
      if (this.recognition) {
        try {
          const node = await this.network.findNode(partnerId);
          const name = node
            ? [node.name, node.surname].filter(Boolean).join(' ') || node.username
            : 'A partner';
          await this.recognition.promotion(partnerId, from, resolved.level, name);
        } catch { /* recognition is celebratory, not critical */ }
      }
      // Promotion fan-out (member + upline notified) — best-effort, never fails the read.
      if (this.events) {
        try {
          const node = await this.network?.findNode?.(partnerId).catch(() => null);
          const name = node
            ? [node.name, node.surname].filter(Boolean).join(' ') || node.username
            : null;
          await this.events.emit(
            PROGRESSION_EVENTS.PROMOTED,
            promotedPayload({
              partnerId,
              from,
              to: resolved.level,
              toLabel: LEVEL_LABELS[resolved.level] ?? resolved.level,
              memberName: name,
              uplineId: node?.parentId ?? null,
            }),
          ).catch(() => null);
        } catch { /* fan-out is celebratory, not critical */ }
      }
    }
    return {
      level: resolved.level,
      levelLabel: LEVEL_LABELS[resolved.level],
      next: resolved.next,
      nextLabel: resolved.next ? LEVEL_LABELS[resolved.next] : null,
      percent: resolved.percent,
      completed: resolved.completed,
      missing: resolved.missing,
      remainingActions: resolved.remainingActions,
      milestones: toMilestones(doc),
      signals: { recruits: signals.recruits, activeDownline: signals.activeDownline, maintenanceOk: signals.maintenanceOk },
      promoted,
    };
  }

  /** Slim summary for the Action Center (no extra queries beyond GetMine). */
  async summarize({ partnerId, now = new Date() }) {
    const full = await this.execute({ partnerId, now });
    return { level: full.level, next: full.next, missing: full.missing.slice(0, 2), promoted: full.promoted };
  }
}

export class UpdateMilestonesUseCase {
  /** @param {{progress}} deps */
  constructor({ progress }) {
    this.progress = progress;
  }

  async execute({ partnerId, patch }) {
    const built = buildMilestonePatch(patch);
    const keys = Object.keys(built).map((k) => k.split('.')[0]);
    const doc = await this.progress.upsertMilestones(partnerId, built, {
      at: new Date(),
      by: partnerId,
      key: keys.join(','),
    });
    return { milestones: toMilestones(doc) };
  }
}

/** Member requests G8 nomination (cell leaders and above). */
export class RequestNominationUseCase {
  /** @param {{progress, network, orders, mine}} deps */
  constructor({ progress, network, orders, mine }) {
    Object.assign(this, { progress, network, orders, mine });
  }

  async execute({ partnerId, note = '' }) {
    const journey = await this.mine.execute({ partnerId });
    if (RANK(journey.level) < RANK('cell_leader')) {
      throw new ForbiddenException('G nomination opens at Cell Leader');
    }
    const doc = await this.progress.findByPartner(partnerId);
    if (doc?.nomination?.status === 'pending') throw new ConflictException('Nomination already pending');
    if (doc?.nomination?.status === 'approved') throw new ConflictException('Nomination already approved');
    await this.progress.requestNomination(partnerId, String(note ?? '').slice(0, 500));
    return { status: 'pending' };
  }
}

/** Only a G8 Leader may decide nominations (never their own). */
export class DecideNominationUseCase {
  /** @param {{progress, network, orders, mine}} deps */
  constructor({ progress, network, orders, mine }) {
    Object.assign(this, { progress, network, orders, mine });
  }

  async execute({ approverId, partnerId, approved }) {
    if (String(approverId) === String(partnerId)) throw new ForbiddenException('You cannot decide your own nomination');
    const approver = await this.mine.execute({ partnerId: approverId });
    if (approver.level !== 'g8') throw new ForbiddenException('Only a G8 Leader may decide nominations');
    const doc = await this.progress.decideNomination(partnerId, approved === true, approverId);
    if (!doc) throw new NotFoundException('No pending nomination');
    return { status: doc.nomination.status };
  }
}

/** Pending G-nominations in the requester's downline, with member labels. */
export class ListPendingNominationsUseCase {
  /** @param {{progress, network}} deps */
  constructor({ progress, network }) {
    Object.assign(this, { progress, network });
  }

  async execute({ requesterId, limit = 100 }) {
    const { ids } = await collectDownlineIds(this.network, requesterId);
    const rows = await this.progress.listPendingNominations(ids.slice(0, 2000), limit);
    if (rows.length === 0) return { items: [], total: 0 };
    const nodes = await this.network.findNodesByIds(rows.map((r) => r.partnerId));
    const labels = Object.fromEntries(nodes.map((nd) => [String(nd.id), {
      username: nd.username,
      name: [nd.name, nd.surname].filter(Boolean).join(' ') || nd.username,
    }]));
    return {
      items: rows.map((r) => ({
        partnerId: String(r.partnerId),
        level: r.level ?? null,
        note: r.nomination?.note ?? '',
        requestedAt: r.nomination?.at ?? r.updatedAt ?? null,
        member: labels[String(r.partnerId)] ?? null,
      })),
      total: rows.length,
    };
  }
}

/**
 * G8 oversight rollup: distribution + leaders + pending nominations.
 * Gated to ladder-g8 members and admins (with bootstrap-email parity,
 * mirroring requireRole) — everyone else gets 403.
 */
export class GetOversightUseCase {
  /** @param {{mine, partners, distribution, pending}} deps (composed use cases) */
  constructor({ mine, partners, distribution, pending }) {
    Object.assign(this, { mine, partners, distribution, pending });
  }

  async execute({ requesterId }) {
    const [me, adminDoc] = await Promise.all([
      this.mine.execute({ partnerId: requesterId }),
      this.partners.findById(requesterId),
    ]);
    const role = lenientRole(adminDoc?.role);
    const isAdmin = role === 'admin'
      || adminBootstrapEmails().includes(String(adminDoc?.email ?? '').toLowerCase());
    if (me.level !== 'g8' && !isAdmin) {
      throw new ForbiddenException('Oversight is available to G8 Leaders and admins');
    }
    const [dist, nominations] = await Promise.all([
      this.distribution.execute({ partnerId: requesterId }),
      this.pending.execute({ requesterId }),
    ]);
    return {
      level: me.level,
      isAdmin,
      total: dist.total,
      capped: dist.capped,
      distribution: dist.distribution,
      leaders: dist.leaders,
      pendingNominations: nominations.items,
      pendingCount: nominations.total,
    };
  }
}

/** Leadership pipeline: stored levels across the bounded downline. */
export class TeamDistributionUseCase {
  /** @param {{progress, network}} deps */
  constructor({ progress, network }) {
    Object.assign(this, { progress, network });
  }

  async execute({ partnerId }) {
    const { ids } = await collectDownlineIds(this.network, partnerId);
    const bounded = ids.slice(0, 2000);
    const levels = await this.progress.levelsFor(bounded);
    const dist = Object.fromEntries(LEVELS.map((l) => [l, 0]));
    for (const lvl of Object.values(levels)) {
      if (lvl in dist) dist[lvl] += 1;
      else dist.partner += 1;
    }
    dist.prospect = 0;
    return {
      total: bounded.length,
      capped: ids.length > bounded.length,
      distribution: dist,
      leaders: (dist.ecl ?? 0) + (dist.cell_leader ?? 0) + (dist.g_leader ?? 0) + (dist.g8 ?? 0),
    };
  }
}
