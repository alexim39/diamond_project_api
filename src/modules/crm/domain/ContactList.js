/**
 * Contact-list submission rules — pure, unit-testable.
 * A new partner owes their upline a working list, not a single contact:
 * the minimum keeps the onboarding deliverable meaningful, and the batch
 * groups one submission so the upline can work it to completion.
 */

/** Minimum unsubmitted contacts before a list can go to the upline. */
export const MIN_CONTACTS = 10;

/** Stages that count as "worked" (anything past a fresh New row). */
export const isWorkedStage = (stage) => String(stage ?? 'New') !== 'New';
