const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const footer = (why) => `
  <p style="color:#888;font-size:12px;">${why} Change anytime in Notification settings.</p>
`;

const steps = (items) => `<ol>${items.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>`;

/**
 * Lifecycle email templates — pure builders (testable without a mailer).
 * Welcome, recruit-alert and promotion mails are lifecycle mail: always
 * sent alongside the in-app row (delivery `force` policy), never gated
 * on marketing preferences.
 */
export const buildWelcome = ({ memberName }) => ({
  subject: `Welcome to Diamond Project, ${memberName}! Here are your first steps`,
  html: `
    <p>Hi ${escapeHtml(memberName)},</p>
    <p>Welcome aboard! Your Diamond Project journey has begun. Here is exactly what to do first:</p>
    ${steps([
      'Complete your profile — phone number and address, plus a photo so prospects recognise you.',
      'Take the IPO course in the Training Center — it unlocks your first promotion.',
      'Add your first prospect from people you already know.',
      'Set your first goal so your pace is tracked from day one.',
    ])}
    <p><a href="/dashboard">Open your Daily Action Center</a></p>
    ${footer('You get this because you just joined Diamond Project.')}
  `,
});

export const buildRecruitAlert = ({ memberName, uplineName }) => ({
  subject: `${memberName} just joined with your code — here is what to do next`,
  html: `
    <p>Hi ${escapeHtml(uplineName)},</p>
    <p>Great news — <strong>${escapeHtml(memberName)}</strong> just signed up with the reservation code you recorded. New recruits activate fastest in their first 48 hours:</p>
    ${steps([
      `Call ${memberName} today — welcome them personally and answer first questions.`,
      'Schedule their onboarding session this week.',
      'Walk them through the IPO course and their first prospect list.',
      'Check their profile is complete so they are reachable.',
    ])}
    <p><a href="/dashboard/mentorship/partners/my-partners">View your partners</a></p>
    ${footer('You get this because someone joined with your code.')}
  `,
});

export const buildPromotionMember = ({ memberName, toLabel }) => ({
  subject: `Congratulations — you reached ${toLabel}!`,
  html: `
    <p>Hi ${escapeHtml(memberName)},</p>
    <p>You just reached <strong>${escapeHtml(toLabel)}</strong> on the Diamond journey. Take a moment — then keep climbing:</p>
    ${steps([
      'Open My Journey to see your next gate and readiness.',
      'Tell your upline — recognition fuels duplication.',
      'Set one goal that matches your new rank.',
    ])}
    <p><a href="/dashboard/progress">View your journey</a></p>
    ${footer('You get this because you earned a promotion.')}
  `,
});

export const buildPromotionUpline = ({ memberName, toLabel, uplineName }) => ({
  subject: `${memberName} just reached ${toLabel} — congratulate them`,
  html: `
    <p>Hi ${escapeHtml(uplineName)},</p>
    <p><strong>${escapeHtml(memberName)}</strong> from your team just reached <strong>${escapeHtml(toLabel)}</strong>. Leaders who recognise promotion promptly duplicate faster:</p>
    ${steps([
      `Call or message ${memberName} today — public recognition in the Community multiplies the effect.`,
      'Review their next gate together in your next 15-minute review.',
      'Ask who they are developing behind them — leaders build leaders.',
    ])}
    <p><a href="/dashboard/network/tree">View your team</a></p>
    ${footer('You get this because someone in your downline earned a promotion.')}
  `,
});
