/**
 * Admin audit vocabulary — who did what to whom, when.
 * New admin actions add a `domain.verb` key here AND record it at the
 * decision site (best-effort, never fails the request). The viewer and
 * tests pin this list so renames stay deliberate.
 */
export const AUDIT_ACTIONS = Object.freeze([
  'role.set',
  'account.suspend',
  'account.unsuspend',
  'account.signout',
  'account.reset-password',
  'account.erase',
  'payout.release',
  'payout.void',
  'withdrawal.decide',
  'campaign.decide',
  'order.decide',
  'reservation.decide',
  'reservation.delete',
  'training.quiz.save',
  'training.media.save',
  'training.media.revert',
  'ticket.decide',
  'moderation.remove',
  'moderation.dismiss',
  'broadcast.send',
  'broadcast.campaign.queue',
  'broadcast.campaign.cancel',
  'broadcast.campaign.retry',
  'broadcast.delete',
  'billing.plan.update',
  'product.create',
  'product.update',
]);

const str = (v, max) => {
  const s = v === undefined || v === null ? '' : String(v);
  return s.slice(0, max);
};

/** Pure entry factory — throws on unknown action so typos fail loudly in dev/tests. */
export const createAuditEntry = ({ actorId, actorLabel = null, action, targetType = null, targetId = null, detail = null }) => {
  if (!AUDIT_ACTIONS.includes(action)) throw new Error(`Unknown audit action: ${action}`);
  const entry = {
    actorId: str(actorId, 64),
    action,
    ...(actorLabel ? { actorLabel: str(actorLabel, 120) } : {}),
    ...(targetType ? { targetType: str(targetType, 64) } : {}),
    ...(targetId ? { targetId: str(targetId, 64) } : {}),
    ...(detail && typeof detail === 'object' ? { detail: JSON.parse(JSON.stringify(detail).slice(0, 4000)) } : {}),
  };
  if (!entry.actorId) throw new Error('Audit entry requires actorId');
  return entry;
};
