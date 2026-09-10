import { ForbiddenException, NotFoundException } from '../../../shared/domain/AppError.js';
import { computeProgress, createGoalEntity } from '../domain/Goal.entity.js';
import { collectDownlineIds } from '../../network/infrastructure/Network.mongo.repository.js';

const samePartner = (docPartnerId, requesterId) => String(docPartnerId) === String(requesterId);
const assertOwner = (doc, requesterId, what = 'Goal') => {
  if (!doc) throw new NotFoundException(`${what} not found`);
  if (!samePartner(doc.partnerId, requesterId)) throw new ForbiddenException('Not your goal');
  return doc;
};

/** Resolve the live numerator for a goal kind (no cached counters). */
async function currentValue(kind, partnerId, start, end, { orders, prospects, network }) {
  switch (kind) {
    case 'sales':
      return (await orders.volumeBetween(partnerId, start, end)).total;
    case 'recruitment':
      return orders.recruitsBetween(partnerId, start, end);
    case 'conversion':
      return prospects.countConverted(partnerId, start, end);
    case 'team_volume': {
      const { ids } = await collectDownlineIds(network, partnerId);
      return (await orders.volumeForBetween(ids, start, end)).total;
    }
    default:
      return 0;
  }
}

export class CreateGoalUseCase {
  /** @param {{goals}} deps */
  constructor({ goals }) {
    this.goals = goals;
  }

  async execute({ partnerId, ...input }) {
    return this.goals.create({ ...createGoalEntity(input), partnerId });
  }
}

export class ListGoalsUseCase {
  /** @param {{goals, orders, prospects, network}} deps */
  constructor({ goals, orders, prospects, network }) {
    Object.assign(this, { goals, orders, prospects, network });
  }

  async execute({ partnerId, now = new Date() }) {
    const goals = await this.goals.listByPartner(partnerId);
    return Promise.all(goals.map(async (g) => {
      const start = new Date(g.startDate);
      const end = new Date(g.endDate);
      const current = await currentValue(g.kind, partnerId, start, end, this);
      return { ...g, progress: computeProgress(current, g.target, start, end, now) };
    }));
  }
}

export class UpdateGoalUseCase {
  /** @param {{goals}} deps */
  constructor({ goals }) {
    this.goals = goals;
  }

  async execute({ requesterId, goalId, ...patch }) {
    const existing = assertOwner(await this.goals.findById(goalId), requesterId);
    const merged = { ...existing, ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) };
    const entity = createGoalEntity(merged); // re-validate whole definition
    return this.goals.updateById(goalId, entity);
  }
}

export class DeleteGoalUseCase {
  /** @param {{goals}} deps */
  constructor({ goals }) {
    this.goals = goals;
  }

  async execute({ requesterId, goalId }) {
    assertOwner(await this.goals.findById(goalId), requesterId);
    await this.goals.deleteById(goalId);
    return { deleted: true };
  }
}

export class GetTrendsUseCase {
  /** @param {{orders}} deps */
  constructor({ orders }) {
    this.orders = orders;
  }

  async execute({ partnerId, months = 6 }) {
    const m = Math.min(Math.max(Number(months) || 6, 2), 12);
    return { buckets: await this.orders.volumeByMonth(partnerId, m) };
  }
}
