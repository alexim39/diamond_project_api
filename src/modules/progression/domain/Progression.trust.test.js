import test from 'node:test';
import assert from 'node:assert/strict';
import { gate, CONFIRMABLE_KEYS, confirmed } from './Progression.levels.js';

test('trust legs require upline confirmation, not self-tap', () => {
  assert.ok(CONFIRMABLE_KEYS.includes('fullTime'));
  assert.ok(CONFIRMABLE_KEYS.includes('office'));
  assert.ok(CONFIRMABLE_KEYS.includes('onboardingSession'));
  const bare = { fullTime: { done: true }, office: { done: true }, onboardingSession: { done: true } };
  assert.equal(gate('active', {}, bare).find((r) => r.key === 'onboardingSession').met, false);
  assert.equal(gate('ecl', { kingsmen: 5 }, bare).find((r) => r.key === 'fullTime').met, false);
  const ok = {
    fullTime: { done: true, confirmedAt: new Date() },
    office: { done: true, confirmedAt: new Date() },
    onboardingSession: { done: true, confirmedAt: new Date() },
  };
  assert.equal(gate('active', {}, ok).find((r) => r.key === 'onboardingSession').met, true);
  assert.equal(confirmed({ done: true }), false);
  assert.equal(confirmed({ done: true, confirmedAt: new Date() }), true);
});
