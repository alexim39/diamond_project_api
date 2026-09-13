import { ForbiddenException, NotFoundException } from '../../../shared/domain/AppError.js';
import { LEADERSHIP_LEVELS, assertRsvpStatus, createEventEntity } from '../domain/Event.entity.js';
import { isAncestor } from '../../network/infrastructure/Network.mongo.repository.js';

const pageOf = (limit, max = 50) => Math.min(Math.max(Number(limit) || 20, 1), max);

async function viewerLevel(progress, viewerId) {
  if (!progress?.levelsFor) return null;
  const map = await progress.levelsFor([String(viewerId)]);
  return map[String(viewerId)] ?? null;
}

async function visible(event, viewerId, viewerIsLeader, { network }) {
  if (String(event.authorId) === String(viewerId)) return true;
  if (event.scope === 'global') return true;
  if (event.scope === 'team') return isAncestor(network, event.authorId, viewerId);
  if (event.scope === 'leadership') return viewerIsLeader;
  return false;
}

async function enrich(events, viewerId, store) {
  const ids = events.map((e) => e.id);
  const [counts, mine, authors] = await Promise.all([
    store.rsvpCounts(ids),
    store.myRsvps(ids, viewerId),
    store.authorLabels(events.map((e) => e.authorId)),
  ]);
  return events.map((e) => ({
    ...e,
    author: authors[e.authorId] ?? null,
    rsvps: counts[e.id] ?? { going: 0, interested: 0, declined: 0, total: 0 },
    myRsvp: mine[e.id] ?? null,
  }));
}

export class CreateEventUseCase {
  /** @param {{events}} deps */
  constructor({ events }) {
    this.events = events;
  }

  async execute({ authorId, ...input }) {
    return this.events.createEvent({ ...createEventEntity(input), authorId });
  }
}

export class ListUpcomingUseCase {
  /** @param {{events, network, progress}} deps */
  constructor({ events, network, progress }) {
    Object.assign(this, { events, network, progress });
  }

  async execute({ viewerId, limit = 20, now = new Date() }) {
    const lim = pageOf(limit);
    const level = await viewerLevel(this.progress, viewerId);
    const viewerIsLeader = LEADERSHIP_LEVELS.includes(level);
    // Over-fetch, then visibility-filter (team checks walk the chain).
    const candidates = await this.events.upcomingCandidates(now, lim * 3 + 10);
    const seen = [];
    for (const event of candidates) {
      if (seen.length >= lim) break;
      // eslint-disable-next-line no-await-in-loop
      if (await visible(event, viewerId, viewerIsLeader, this)) seen.push(event);
    }
    return { items: await enrich(seen, viewerId, this.events), viewerLevel: level };
  }
}

export class ListMyEventsUseCase {
  /** @param {{events}} deps */
  constructor({ events }) {
    this.events = events;
  }

  async execute({ authorId, limit = 50 }) {
    const rows = await this.events.listByAuthor(authorId, pageOf(limit, 200));
    return { items: await enrich(rows, authorId, this.events), total: rows.length };
  }
}

export class GetEventUseCase {
  /** @param {{events, network, progress}} deps (visibility-checked) */
  constructor({ events, network, progress }) {
    Object.assign(this, { events, network, progress });
  }

  async execute({ partnerId, eventId }) {
    const event = await this.events.findEventById(eventId);
    if (!event) throw new NotFoundException('Event not found');
    const level = await viewerLevel(this.progress, partnerId);
    if (!(await visible(event, partnerId, LEADERSHIP_LEVELS.includes(level), this))) {
      throw new ForbiddenException('You cannot view this event');
    }
    const [enriched] = await enrich([event], partnerId, this.events);
    return enriched;
  }
}

export class RsvpUseCase {
  /** @param {{events, network, progress}} deps (visibility-checked) */
  constructor({ events, network, progress }) {
    Object.assign(this, { events, network, progress });
  }

  async execute({ partnerId, eventId, status }) {
    const event = await this.events.findEventById(eventId);
    if (!event) throw new NotFoundException('Event not found');
    const level = await viewerLevel(this.progress, partnerId);
    if (!(await visible(event, partnerId, LEADERSHIP_LEVELS.includes(level), this))) {
      throw new ForbiddenException('You cannot RSVP to this event');
    }
    const rsvp = await this.events.upsertRsvp(eventId, partnerId, assertRsvpStatus(status));
    const counts = await this.events.rsvpCounts([eventId]);
    return { rsvp, counts: counts[eventId] ?? counts[String(eventId)] ?? { going: 0, interested: 0, declined: 0, total: 0 } };
  }
}

/** Authors edit their own events (full entity re-validated, RSVPs kept). */
export class UpdateEventUseCase {
  /** @param {{events}} deps */
  constructor({ events }) {
    this.events = events;
  }

  async execute({ partnerId, eventId, ...input }) {
    const event = await this.events.findEventById(eventId);
    if (!event) throw new NotFoundException('Event not found');
    if (String(event.authorId) !== String(partnerId)) {
      throw new ForbiddenException('Only the author can edit');
    }
    return this.events.updateEvent(eventId, createEventEntity(input));
  }
}

/** Authors cancel their own events (RSVPs cascade in the store). */
export class CancelEventUseCase {  /** @param {{events}} deps */
  constructor({ events }) {
    this.events = events;
  }

  async execute({ partnerId, eventId }) {
    const event = await this.events.findEventById(eventId);
    if (!event) throw new NotFoundException('Event not found');
    if (String(event.authorId) !== String(partnerId)) {
      throw new ForbiddenException('Only the author can cancel');
    }
    return this.events.deleteEvent(eventId);
  }
}
