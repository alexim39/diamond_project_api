import { RESERVATION_EVENTS } from '../../reservations/domain/ReservationEvents.js';

/**
 * Activation fan-out — closes the onboarding loop after signup consumes
 * a code. Two independent handlers on `reservation.consumed`:
 * 1. prospect-close: the linked prospect row flips to Converted so it
 *    stops rotting in the pipeline (record-path signups never touched it).
 * 2. upline notify: the referrer gets a stored team notification with a
 *    deep link — keyed per new member, so reruns are no-ops.
 * Both are best-effort with per-recipient isolation; a failure in one
 * never affects the other (or the signup, long committed).
 */
export const activationKey = (partnerId) => `activation:${partnerId}`;

export const buildActivationHandlers = ({ prospects, stored, notify }) => ({
  async closeProspect({ prospectId }) {
    if (!prospectId) return { status: 'skipped', reason: 'no-prospect' };
    try {
      await prospects.updateStatus(prospectId, { stage: 'Converted', name: 'Converted' });
      return { status: 'closed' };
    } catch (error) {
      return { status: 'failed', error: error?.message ?? String(error) };
    }
  },

  async notifyUpline({ partnerId, uplineId, memberName }) {
    if (!uplineId) return { status: 'skipped', reason: 'no-upline' };
    const key = activationKey(partnerId);
    try {
      if (await stored.findByKey(uplineId, key).catch(() => null)) {
        return { status: 'skipped', reason: 'already-sent' };
      }
      await notify.execute({
        recipientId: uplineId,
        category: 'team',
        priority: 'high',
        title: `${memberName} joined with your code`,
        body: `${memberName} just signed up with the reservation code you recorded. Schedule their onboarding session and add them to your follow-ups.`,
        icon: 'person_add',
        link: '/dashboard/mentorship/partners/my-partners',
        key,
      });
      return { status: 'notified' };
    } catch (error) {
      return { status: 'failed', error: error?.message ?? String(error) };
    }
  },
});

/**
 * @param {{events, prospects, stored, notify}} deps
 * @returns unsubscribe function
 */
export const subscribeActivation = ({ events, prospects, stored, notify }) => {
  const handlers = buildActivationHandlers({ prospects, stored, notify });
  return events.on(RESERVATION_EVENTS.CONSUMED, async (payload) => {
    const [prospect, upline] = await Promise.all([
      handlers.closeProspect(payload),
      handlers.notifyUpline(payload),
    ]);
    return { prospect, upline };
  });
};
