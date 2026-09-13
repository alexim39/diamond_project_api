import {
  ForbiddenException, NotFoundException, ValidationException,
} from '../../../shared/domain/AppError.js';
import { createAnnouncementEntity, createDirectEntity, createTeamAnnouncementEntity } from '../domain/Message.entity.js';
import { collectDownlineIds, isAncestor } from '../../network/infrastructure/Network.mongo.repository.js';
import { TeamModel } from '../../../apps/teams/models/teams.model.js';

/** Two partners may DM iff one is the other's upline (any depth). */
async function related(network, a, b) {
  return (await isAncestor(network, a, b)) || (await isAncestor(network, b, a));
}

/** POST /v1/messages — direct message within the business relationship. */
export class SendDirectUseCase {
  /** @param {{messages, network}} deps */
  constructor({ messages, network }) {
    Object.assign(this, { messages, network });
  }

  async execute({ senderId, to, ...input }) {
    if (String(senderId) === String(to)) throw new ValidationException('You cannot message yourself');
    const node = await this.network.findNode(to);
    if (!node) throw new NotFoundException('Recipient not found');
    if (!(await related(this.network, senderId, to))) {
      throw new ForbiddenException('Direct messages are limited to your upline and downline');
    }
    return this.messages.create({ ...createDirectEntity(input), senderId, recipientId: to, kind: 'direct' });
  }
}

/** POST /v1/messages/team-announcements — owner or member to the whole team. */
export class SendTeamAnnouncementUseCase {
  /** @param {{messages}} deps */
  constructor({ messages }) {
    this.messages = messages;
  }

  async execute({ senderId, ...input }) {
    const entity = createTeamAnnouncementEntity(input);
    const team = await TeamModel.findById(entity.teamId).select('partnerId members teamName').lean();
    if (!team) throw new NotFoundException('Team not found');
    const me = String(senderId);
    const isOwner = String(team.partnerId) === me;
    const isMember = (team.members ?? []).map(String).includes(me);
    if (!isOwner && !isMember) {
      throw new ForbiddenException('Only team owners and members can announce to the team');
    }
    // Recipients: every member plus the owner (who may not list themselves),
    // minus the sender — they see it under Sent.
    const recipients = [...new Set([
      ...((team.members ?? []).map(String)),
      String(team.partnerId),
    ])].filter((id) => id && id !== me);
    if (recipients.length === 0) throw new ValidationException('No teammates to announce to');
    const { inserted } = await this.messages.createMany(recipients.map((recipientId) => ({
      senderId,
      recipientId,
      kind: 'team',
      teamId: entity.teamId,
      title: entity.title,
      body: entity.body,
    })));
    return { inserted, teamId: entity.teamId };
  }
}

/** POST /v1/messages/announcements — leader to direct team or all downline. */
export class SendAnnouncementUseCase {
  /** @param {{messages, network}} deps */
  constructor({ messages, network }) {
    Object.assign(this, { messages, network });
  }

  async execute({ senderId, ...input }) {
    const entity = createAnnouncementEntity(input);
    const recipients = entity.scope === 'all'
      ? (await collectDownlineIds(this.network, senderId)).ids
      : (await this.network.findChildren([String(senderId)], 500)).map((c) => c.id);
    if (recipients.length === 0) throw new ValidationException('You have no downline to announce to');
    const kind = entity.scope === 'all' ? 'broadcast' : 'announcement';
    const { inserted } = await this.messages.createMany(recipients.map((recipientId) => ({
      senderId,
      recipientId,
      kind,
      title: entity.title,
      body: entity.body,
    })));
    return { inserted, scope: entity.scope };
  }
}

export class ListInboxUseCase {
  /** @param {{messages}} deps */
  constructor({ messages }) {
    this.messages = messages;
  }

  async execute({ partnerId, limit = 50 }) {
    return this.messages.inbox(partnerId, Math.min(Math.max(Number(limit) || 50, 1), 100));
  }
}

export class ListSentUseCase {
  /** @param {{messages}} deps */
  constructor({ messages }) {
    this.messages = messages;
  }

  async execute({ partnerId, limit = 50 }) {
    return this.messages.sent(partnerId, Math.min(Math.max(Number(limit) || 50, 1), 100));
  }
}

export class GetThreadUseCase {
  /** @param {{messages, network}} deps */
  constructor({ messages, network }) {
    Object.assign(this, { messages, network });
  }

  async execute({ partnerId, counterpartId, limit = 100 }) {
    if (!(await related(this.network, partnerId, counterpartId))) {
      throw new ForbiddenException('No conversation with that partner');
    }
    return this.messages.thread(partnerId, counterpartId, Math.min(Math.max(Number(limit) || 100, 1), 200));
  }
}

/** Recipients only; idempotent (re-reading is free). */
export class MarkReadUseCase {
  /** @param {{messages}} deps */
  constructor({ messages }) {
    this.messages = messages;
  }

  async execute({ partnerId, messageId }) {
    const found = await this.messages.findById(messageId);
    if (!found) throw new NotFoundException('Message not found');
    if (String(found.recipientId) !== String(partnerId)) {
      throw new ForbiddenException('Only the recipient can mark this read');
    }
    return this.messages.markRead(messageId);
  }
}

export class UnreadCountUseCase {
  /** @param {{messages}} deps */
  constructor({ messages }) {
    this.messages = messages;
  }

  async execute({ partnerId }) {
    return { unread: await this.messages.unreadCount(partnerId) };
  }
}

/** Everyone you may DM: upline chain + direct downline (safe fields). */
export class ListContactsUseCase {
  /** @param {{network}} deps */
  constructor({ network }) {
    this.network = network;
  }

  async execute({ partnerId }) {
    const uplines = [];
    let current = String(partnerId);
    const seen = new Set([current]);
    for (let d = 0; d < 10 && current; d++) {
      const node = await this.network.findNode(current);
      const parent = node?.parentId ? String(node.parentId) : null;
      if (!parent || seen.has(parent)) break;
      seen.add(parent);
      const p = await this.network.findNode(parent);
      if (!p) break;
      uplines.push({ id: p.id, username: p.username, name: [p.name, p.surname].filter(Boolean).join(' ') || p.username, relation: 'upline' });
      current = parent;
    }
    const children = await this.network.findChildren([String(partnerId)], 500);
    return [
      ...uplines,
      ...children.map((c) => ({
        id: c.id,
        username: c.username,
        name: [c.name, c.surname].filter(Boolean).join(' ') || c.username,
        relation: 'downline',
      })),
    ];
  }
}
