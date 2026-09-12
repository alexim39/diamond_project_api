import crypto from 'node:crypto';
import { ValidationException } from '../../../shared/domain/AppError.js';
import { MIN_CONTACTS } from '../domain/ContactList.js';
import { CONTACT_LIST_EVENTS, contactListSubmittedPayload } from '../domain/ContactListEvents.js';
import { collectDownlineIds } from '../../network/infrastructure/Network.mongo.repository.js';

/** GET /v1/prospects/contact-list/mine — working list + submitted batches. */
export class GetMyContactListUseCase {
  /** @param {{prospects}} deps */
  constructor({ prospects }) {
    this.prospects = prospects;
  }

  async execute({ partnerId }) {
    const [unsubmitted, batches] = await Promise.all([
      this.prospects.listUnsubmitted(partnerId),
      this.prospects.submittedBatches(partnerId),
    ]);
    const slim = (p) => ({
      id: String(p.id ?? p._id),
      prospectName: p.prospectName,
      prospectSurname: p.prospectSurname ?? '',
      prospectPhone: p.prospectPhone,
      relationship: p.relationship ?? 'Other',
      priority: p.priority ?? 'normal',
      createdAt: p.createdAt ?? null,
    });
    return {
      unsubmitted: unsubmitted.map(slim),
      unsubmittedCount: unsubmitted.length,
      minRequired: MIN_CONTACTS,
      canSubmit: unsubmitted.length >= MIN_CONTACTS,
      batches,
    };
  }
}

/** POST /v1/prospects/contact-list/submit — stamp one batch, notify upline. */
export class SubmitContactListUseCase {
  /** @param {{prospects, network?, events?}} deps */
  constructor({ prospects, network = null, events = null }) {
    Object.assign(this, { prospects, network, events });
  }

  async execute({ partnerId }) {
    const pending = await this.prospects.listUnsubmitted(partnerId);
    if (pending.length < MIN_CONTACTS) {
      throw new ValidationException(
        `Add at least ${MIN_CONTACTS} contacts before submitting (you have ${pending.length})`,
      );
    }
    const batch = `list-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
    const { count, submittedAt } = await this.prospects.submitContactList(partnerId, batch);
    if (this.events) {
      try {
        const node = await this.network?.findNode?.(partnerId).catch(() => null);
        await this.events.emit(
          CONTACT_LIST_EVENTS.SUBMITTED,
          contactListSubmittedPayload({
            partnerId,
            memberName: node
              ? [node.name, node.surname].filter(Boolean).join(' ') || node.username
              : null,
            batch,
            count,
          }),
        ).catch(() => null);
      } catch { /* submit fan-out never fails the submit */ }
    }
    return { batch, count, submittedAt };
  }
}

/** GET /v1/prospects/contact-list/downline — submitted lists with progress. */
export class ListDownlineContactListsUseCase {
  /** @param {{prospects, network}} deps */
  constructor({ prospects, network }) {
    Object.assign(this, { prospects, network });
  }

  async execute({ requesterId, limit = 100 }) {
    const { ids } = await collectDownlineIds(this.network, requesterId);
    const bounded = ids.slice(0, 2000);
    const [rows, contacts] = await Promise.all([
      this.prospects.downlineSubmittedBatches(bounded),
      this.prospects.submittedContacts(bounded, 500),
    ]);
    const capped = rows.slice(0, Math.min(Math.max(Number(limit) || 100, 1), 200));
    if (capped.length === 0) return { items: [], total: 0 };
    const byList = new Map();
    for (const c of contacts) {
      const k = `${c.partnerId}::${c.listBatch ?? 'legacy'}`;
      if (!byList.has(k)) byList.set(k, []);
      byList.get(k).push(c);
    }
    const slimContact = (c) => ({
      id: String(c.id ?? c._id),
      prospectName: c.prospectName,
      prospectSurname: c.prospectSurname ?? '',
      prospectPhone: c.prospectPhone,
      relationship: c.relationship ?? 'Other',
      priority: c.priority ?? 'normal',
      bestTimeToCall: c.bestTimeToCall ?? '',
      consentToContact: c.consentToContact === true,
      stage: c.status?.stage ?? 'New',
    });
    const withContacts = capped.map((r) => {
      const all = (byList.get(`${r.partnerId}::${r.batch}`) ?? []).map(slimContact);
      // Unworked first so the upline calls fresh numbers, then cap.
      all.sort((a, b) => Number(a.stage !== 'New') - Number(b.stage !== 'New'));
      return { ...r, contacts: all.slice(0, 30) };
    });
    const nodes = await this.network.findNodesByIds([...new Set(withContacts.map((r) => r.partnerId))]);
    const labels = Object.fromEntries(nodes.map((nd) => [String(nd.id), {
      username: nd.username,
      name: [nd.name, nd.surname].filter(Boolean).join(' ') || nd.username,
    }]));
    return {
      items: withContacts.map((r) => ({ ...r, member: labels[r.partnerId] ?? null })),
      total: rows.length,
    };
  }
}
