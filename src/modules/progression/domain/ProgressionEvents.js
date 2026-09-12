/**
 * Progression lifecycle events — emitted by the journey read model when it
 * detects (and persists) a level-up. Small serializable payloads; the
 * notifications slice subscribes, the ladder never imports it.
 */

export const PROGRESSION_EVENTS = {
  /** A member's stored level just advanced (fires exactly once per rank). */
  PROMOTED: 'progression.promoted',
};

/**
 * @param {{partnerId, from, to, toLabel, memberName, uplineId}} input
 * (names/ids null when unresolvable — subscribers degrade gracefully.)
 */
export const promotedPayload = ({ partnerId, from, to, toLabel = null, memberName = null, uplineId = null }) => ({
  type: PROGRESSION_EVENTS.PROMOTED,
  partnerId: String(partnerId),
  from: String(from),
  to: String(to),
  toLabel: toLabel ? String(toLabel) : String(to),
  memberName: memberName ? String(memberName) : null,
  uplineId: uplineId ? String(uplineId) : null,
});
