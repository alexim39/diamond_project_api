/**
 * Shared Nigerian state normalization — single source for pool geo
 * matching (leadpool engine), survey writes, and arrival alerts.
 * Free-text states arrive messy ("Lagos", " lagos", "FCT (Abuja)").
 */

/** Normalize free-text Nigerian states so pool rows match partner states. */
const STATE_ALIASES = new Map([
  ['abuja', 'fct abuja'],
  ['fct', 'fct abuja'],
  ['fct (abuja)', 'fct abuja'],
  ['fct-abuja', 'fct abuja'],
  ['fct abuja', 'fct abuja'],
]);

export const normalizeState = (value) => {
  const s = String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!s) return '';
  return STATE_ALIASES.get(s) ?? s;
};

export const sameState = (a, b) => {
  const x = normalizeState(a);
  const y = normalizeState(b);
  return !!x && x === y;
};
