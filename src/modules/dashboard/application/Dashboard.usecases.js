/**
 * Dashboard aggregation: one request powers the majority of widgets.
 * Pure composition over slice use cases — no queries of its own, no
 * caching. If volumes ever demand materialized summaries, memoize here:
 * callers (one route, one frontend service) stay untouched.
 */
export class GetOverviewUseCase {
  /** @param {{actions, funnel, team, goals, feed}} deps (composed use cases) */
  constructor({ actions, funnel, team, goals, feed }) {
    Object.assign(this, { actions, funnel, team, goals, feed });
  }

  async execute({ partnerId, days = 30, now = new Date() }) {
    const [actionCenter, funnel, team, goals, notifications] = await Promise.all([
      this.actions.execute({ partnerId, now }),
      this.funnel.execute({ partnerId, days, now }),
      this.team.execute({ partnerId, days, now }),
      this.goals.execute({ partnerId, now }),
      this.feed.execute({ partnerId, now, limit: 5 }),
    ]);
    const behind = goals.filter((g) => !g.progress.complete && !g.progress.onTrack).length;
    return {
      actions: actionCenter,
      funnel,
      team,
      goals: {
        items: goals,
        total: goals.length,
        complete: goals.filter((g) => g.progress.complete).length,
        behind,
      },
      notifications: {
        unreadCount: notifications.unreadCount,
        recent: notifications.items.slice(0, 5),
      },
    };
  }
}
