import { buildFunnel, deltaPct, scoreHealth, windows } from '../domain/Analytics.engine.js';
import { collectDownlineIds } from '../../network/infrastructure/Network.mongo.repository.js';

const clampDays = (days) => Math.min(Math.max(Number(days) || 30, 7), 365);

export class GetFunnelUseCase {
  /** @param {{prospects}} deps */
  constructor({ prospects }) {
    this.prospects = prospects;
  }

  async execute({ partnerId, days = 30, now = new Date() }) {
    const d = clampDays(days);
    const { start, end } = windows(now, d);
    const distribution = await this.prospects.stageDistribution(partnerId, start, end);
    return { days: d, ...buildFunnel(distribution, distribution.Closed ?? 0) };
  }
}

export class GetTeamUseCase {
  /** @param {{orders, network, prospects, goalProgress}} deps */
  constructor({ orders, network, prospects, goalProgress }) {
    Object.assign(this, { orders, network, prospects, goalProgress });
  }

  async execute({ partnerId, days = 30, now = new Date() }) {
    const d = clampDays(days);
    const { start, end, prevStart, prevEnd } = windows(now, d);
    const [{ ids: downline }] = await Promise.all([collectDownlineIds(this.network, partnerId)]);

    const [personal, team, recruits, prevRecruits, prevTeam, active, conversions, goals] = await Promise.all([
      this.orders.volumeBetween(partnerId, start, end),
      this.orders.volumeForBetween(downline, start, end),
      this.orders.recruitsBetween(partnerId, start, end),
      this.orders.recruitsBetween(partnerId, prevStart, prevEnd),
      this.orders.volumeForBetween(downline, prevStart, prevEnd),
      this.orders.activeMemberCount(downline, start, end),
      this.prospects.countConverted(partnerId, start, end),
      this.goalProgress(partnerId),
    ]);

    const downlineTotal = downline.length;
    const activationRate = downlineTotal > 0 ? active / downlineTotal : null;
    const complete = goals.filter((g) => g.progress?.complete).length;
    const goalRate = goals.length > 0 ? complete / goals.length : null;
    const funnel = buildFunnel(await this.prospects.stageDistribution(partnerId, start, end));
    const recruitDelta = deltaPct(recruits, prevRecruits);
    const teamDelta = deltaPct(team.total, prevTeam.total);

    const health = scoreHealth({
      activationRate,
      goalRate,
      funnelRate: funnel.overallRate,
      recruitDeltaPct: recruitDelta,
    });

    return {
      days: d,
      recruits: { current: recruits, previous: prevRecruits, deltaPct: recruitDelta },
      teamVolume: { current: team.total, previous: prevTeam.total, deltaPct: teamDelta },
      personalVolume: personal,
      downline: { total: downlineTotal, active, inactive: Math.max(0, downlineTotal - active), activationRate },
      conversions,
      goals: { total: goals.length, complete, rate: goalRate },
      health,
    };
  }
}

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

/**
 * Daily Action Center: "what should I do today?" — urgent notifications
 * first, then behind-pace goals, ready-to-close prospects, then the rest.
 */
export class GetActionsUseCase {
  /** @param {{feed, goals, prospects}} deps (feed/goals are composed use cases) */
  constructor({ feed, goals, prospects }) {
    Object.assign(this, { feed, goals, prospects });
  }

  async execute({ partnerId, now = new Date(), limit = 15 }) {
    const [feed, goals, hot] = await Promise.all([
      this.feed.execute({ partnerId, now, limit: 50 }),
      this.goals.execute({ partnerId, now }),
      this.prospects.findReadyToConvert(partnerId, 5),
    ]);

    const actions = [];
    for (const item of feed.items.filter((i) => i.urgency)) {
      actions.push({
        id: `action:${item.id}`,
        priority: 'high',
        category: item.kind === 'inactive' ? 're-engage' : 'follow-up',
        title: item.title,
        detail: item.body,
        link: item.link,
      });
    }
    for (const g of goals.filter((g) => !g.progress.complete && !g.progress.onTrack)) {
      actions.push({
        id: `action:goal:${g.id}`,
        priority: 'high',
        category: 'goal',
        title: `"${g.title}" is behind pace`,
        detail: `${g.progress.current} of ${g.target} with ${g.progress.daysLeft} days left`,
        link: '/dashboard/goals',
      });
    }
    for (const p of hot) {
      actions.push({
        id: `action:close:${p.id}`,
        priority: 'medium',
        category: 'conversion',
        title: `${p.prospectName ?? 'Prospect'} ${p.prospectSurname ?? ''}`.trim(),
        detail: 'In negotiation — close the loop',
        link: `/dashboard/prospects/detail/${p.id}`,
      });
    }
    for (const item of feed.items.filter((i) => !i.urgency).slice(0, 5)) {
      actions.push({
        id: `action:${item.id}`,
        priority: 'low',
        category: item.kind,
        title: item.title,
        detail: item.body,
        link: item.link,
      });
    }

    actions.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    const lim = Math.min(Math.max(Number(limit) || 15, 1), 50);
    return { actions: actions.slice(0, lim), total: actions.length };
  }
}
