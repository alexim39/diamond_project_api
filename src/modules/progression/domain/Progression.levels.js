/**
 * Diamond progression ladder — pure rules, unit-testable without Mongo.
 *
 * Levels auto-derive by walking entry gates from the bottom up. A gate is
 * a mix of COMPUTED signals (recruits, active team, maintenance — read
 * from source aggregates, never stored) and ATTESTED milestones (training,
 * office, nominations — stored on the progression record with timestamps).
 */

export const LEVELS = [
  'prospect',
  'partner',
  'emerging_active',
  'qualified_active',
  'active',
  'kingsman',
  'ecl',
  'cell_leader',
  'g_leader',
  'g8',
];

export const LEVEL_LABELS = {
  prospect: 'Prospect',
  partner: 'Partner',
  emerging_active: 'Emerging Active Partner',
  qualified_active: 'Qualified Active Partner',
  active: 'Active Partner',
  kingsman: 'Kingsman',
  ecl: 'Emerging Cell Leader',
  cell_leader: 'Cell Leader',
  g_leader: 'G Leader',
  g8: 'G8 Leader',
};

/**
 * Entry gates. Each requirement: {key, label, action, met}.
 * `signals`: {recruits, activeDownline, maintenanceOk, kingsmen, ecls}
 * `m`: milestones subdoc (all fields optional — absent means undone).
 */
export const gate = (level, signals = {}, m = {}) => {
  const done = (x) => x?.done === true;
  const req = (key, label, action, met) => ({ key, label, action, met: met === true });
  switch (level) {
    case 'emerging_active':
      return [
        req('ipo', 'Complete IPO', 'Take the IPO course in the Training Center', done(m.ipo)),
        req('qsg', 'Complete QSG', 'Take the QSG course in the Training Center', done(m.qsg)),
      ];
    case 'qualified_active':
      return [
        req('recruits', 'Connect one new partner', 'Recruit your first partner from the pipeline', (signals.recruits ?? 0) >= 1),
        req('g8Request', 'Submit request to G8 Leader', 'Send your qualification request', m.g8Request?.status === 'submitted' || m.g8Request?.status === 'approved'),
        req('onboardingSession', 'Attend onboarding session', 'Schedule your onboarding session', done(m.onboardingSession)),
      ];
    case 'active':
      return [
        req('qualifiedConfirmed', 'Complete qualification', 'Confirm your qualified-active process', done(m.qualifiedConfirmed)),
      ];
    case 'kingsman':
      return [
        req('activeTeam', 'Grow 5 active partners', 'Activate 5 team members with recent orders', (signals.activeDownline ?? 0) >= 5),
        req('accounts', 'Maintain 3 accounts', 'Record your maintained accounts', (m.accounts?.count ?? 0) >= 3),
        req('maintenance', 'Monthly maintenance compliance', 'Keep personal volume flowing monthly', signals.maintenanceOk === true),
        req('smo', 'Complete SMO', 'Take the SMO course in the Training Center', done(m.smo)),
      ];
    case 'ecl':
      return [
        req('kingsmen', 'Raise 5 Kingsmen', 'Develop 5 downline Kingsmen', (signals.kingsmen ?? 0) >= 5),
        req('fullTime', 'Full-time participation', 'Commit to full-time business participation', done(m.fullTime)),
        req('office', 'Office ownership', 'Register your office', done(m.office)),
      ];
    case 'cell_leader':
      return [
        req('ecls', 'Raise 5 Emerging Cell Leaders', 'Develop 5 downline ECLs', (signals.ecls ?? 0) >= 5),
      ];
    case 'g_leader':
      return [
        req('nomination', 'Nominated by a G8 Leader', 'Request nomination from your G8 Leader', m.nomination?.status === 'approved'),
      ];
    case 'g8':
      return [
        req('appointment', 'G8 appointment', 'Complete your G8 appointment record', done(m.appointment)),
      ];
    default:
      return [];
  }
};

/**
 * Walk the ladder from `from` upward while gates pass.
 * @returns {{level, next, percent, completed, missing, remainingActions}}
 */
export const resolveProgression = (signals = {}, m = {}, from = 'partner') => {
  let level = LEVELS.includes(from) ? from : 'partner';
  for (;;) {
    const idx = LEVELS.indexOf(level);
    const next = LEVELS[idx + 1] ?? null;
    if (!next) break;
    const reqs = gate(next, signals, m);
    if (reqs.length > 0 && reqs.every((r) => r.met)) {
      level = next;
      continue;
    }
    const met = reqs.filter((r) => r.met);
    return {
      level,
      next,
      percent: reqs.length > 0 ? Math.round((met.length / reqs.length) * 100) : 100,
      completed: met.map((r) => r.label),
      missing: reqs.filter((r) => !r.met),
      remainingActions: reqs.filter((r) => !r.met).map((r) => r.action),
    };
  }
  return { level, next: null, percent: 100, completed: [], missing: [], remainingActions: [] };
};

export const RANK = (level) => LEVELS.indexOf(level);
