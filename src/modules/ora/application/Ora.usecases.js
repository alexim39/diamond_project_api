import { AppError, ForbiddenException, NotFoundException, ValidationException } from '../../../shared/domain/AppError.js';
import { buildSystemPrompt, greetingFor, startersForLevel } from '../domain/Ora.persona.js';

/** Recent window sent to the model — bounds tokens per call. */
export const HISTORY_WINDOW = 12;
/** Per-partner daily message cap (cost control; in-memory, resets on restart). */
export const DEFAULT_DAILY_LIMIT = 50;

const dayKey = (now = new Date()) => {
  const d = now instanceof Date ? now : new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const toHistory = (messages = []) => messages
  .filter((m) => (m.role === 'user' || m.role === 'assistant') && String(m.content ?? '').trim())
  .slice(-HISTORY_WINDOW)
  .map((m) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));

const titleOf = (message) => {
  const s = String(message ?? '').trim().replace(/\s+/g, ' ');
  return s.length > 60 ? `${s.slice(0, 59)}…` : (s || 'New conversation');
};

/** Core chat turn: rate-limit → history → context → model → persist. */
export class AskOraUseCase {
  /**
   * @param {{conversations, client, context, dailyLimit?, usage?}} deps
   * (`usage` is a Map for tests; defaults to a module counter.)
   */
  constructor({ conversations, client, context, dailyLimit = DEFAULT_DAILY_LIMIT, usage = null }) {
    Object.assign(this, { conversations, client, context, dailyLimit });
    this.usage = usage ?? new Map();
  }

  async execute({ partnerId, message, conversationId = null, now = new Date() }) {
    const text = String(message ?? '').trim();
    if (!text || text.length > 2000) throw new ValidationException('Message must be 1–2000 characters');
    const key = `${partnerId}:${dayKey(now)}`;
    const used = this.usage.get(key) ?? 0;
    if (used >= this.dailyLimit) {
      throw new AppError('Daily Ora limit reached — please continue tomorrow', 429, 'ORA_RATE_LIMITED');
    }
    let convo = null;
    if (conversationId) {
      convo = await this.conversations.findById(conversationId);
      if (!convo) throw new NotFoundException('Conversation not found');
      if (String(convo.partnerId) !== String(partnerId)) throw new ForbiddenException('Not your conversation');
    } else {
      convo = await this.conversations.create(partnerId, titleOf(text));
    }
    const history = toHistory(convo.messages ?? []);
    const snapshot = await this.context.assemble({ partnerId, now });
    const reply = await this.client.complete({
      system: buildSystemPrompt(snapshot),
      messages: [...history, { role: 'user', content: text }],
    });
    await this.conversations.appendMessage(convo.id, { role: 'user', content: text, at: now });
    await this.conversations.appendMessage(convo.id, { role: 'assistant', content: reply, at: new Date() });
    this.usage.set(key, used + 1);
    return { conversationId: convo.id, reply };
  }
}

/** Greeting + starters + ladder position for the widget's first paint. */
export class GetOraContextUseCase {
  /** @param {{context}} deps */
  constructor({ context }) {
    this.context = context;
  }

  async execute({ partnerId, now = new Date() }) {
    const snapshot = await this.context.assemble({ partnerId, now });
    return {
      displayName: snapshot.displayName,
      level: snapshot.level,
      levelLabel: snapshot.levelLabel,
      next: snapshot.next,
      nextLabel: snapshot.nextLabel,
      percent: snapshot.percent,
      greeting: greetingFor(snapshot),
      starters: startersForLevel(snapshot.level),
    };
  }
}

export class ListOraConversationsUseCase {
  /** @param {{conversations}} deps */
  constructor({ conversations }) {
    this.conversations = conversations;
  }

  async execute({ partnerId, limit = 20 }) {
    const items = await this.conversations.listByPartner(partnerId, limit);
    return {
      items: items.map((c) => ({
        id: String(c.id), title: c.title, updatedAt: c.updatedAt ?? null,
      })),
    };
  }
}

export class GetOraConversationUseCase {
  /** @param {{conversations}} deps */
  constructor({ conversations }) {
    this.conversations = conversations;
  }

  async execute({ partnerId, conversationId }) {
    const convo = await this.conversations.findById(conversationId);
    if (!convo) throw new NotFoundException('Conversation not found');
    if (String(convo.partnerId) !== String(partnerId)) throw new ForbiddenException('Not your conversation');
    return {
      id: String(convo.id),
      title: convo.title,
      messages: (convo.messages ?? []).map((m) => ({ role: m.role, content: m.content, at: m.at ?? null })),
    };
  }
}

export class DeleteOraConversationUseCase {
  /** @param {{conversations}} deps */
  constructor({ conversations }) {
    this.conversations = conversations;
  }

  async execute({ partnerId, conversationId }) {
    const convo = await this.conversations.findById(conversationId);
    if (!convo) throw new NotFoundException('Conversation not found');
    if (String(convo.partnerId) !== String(partnerId)) throw new ForbiddenException('Not your conversation');
    return this.conversations.remove(partnerId, conversationId);
  }
}
