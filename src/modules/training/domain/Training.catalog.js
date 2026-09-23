import { ValidationException } from '../../../shared/domain/AppError.js';

/**
 * Course catalog — the takable IPO / QSG / SMO / Leadership path.
 * Content lives here (versioned with code); progress lives in Mongo.
 * Completing a ladder course auto-checks its progression milestone.
 */

const lesson = (id, title, body, takeaways = [], quiz = [], videoUrl = null, opts = {}) => ({
  id,
  title,
  body,
  takeaways,
  quiz,
  videoUrl,
  posterUrl: opts.posterUrl ?? null,
  captionsUrl: opts.captionsUrl ?? null,
  transcript: opts.transcript ?? null,
  durationSec: opts.durationSec ?? null,
});

export const COURSES = [
  {
    id: 'ipo',
    title: 'Initial Planning Orientation (IPO)',
    tagline: 'Understand the business before you run it.',
    milestone: 'ipo',
    lessons: [
      lesson(
        'ipo-1',
        'What Diamond Project is',
        'Diamond Project is a network marketing business: you earn by selling products and by building a team that sells products. There is no salary and no shortcut — income follows value created. Your first job is to understand the compensation plan at a level where you could explain it on a whiteboard in five minutes.',
        ['Income follows value, not tenure', 'Learn the plan cold before recruiting'],
        [
          { q: 'How do you earn in Diamond Project?', options: ['Salary from the company', 'Selling products and building a team that sells', 'Only by recruiting without selling'], answer: 1 },
          { q: 'What must you be able to explain before recruiting?', options: ['The office layout', 'The compensation plan in 5 minutes', 'Your sponsor’s title'], answer: 1 },
        ],
        '/courses/ipo/ipo-first-lesson-by-Prof-BB-July-2026.mp4',
        {
          captionsUrl: '/courses/ipo/ipo-1.vtt',
          durationSec: 2445,
          transcript: 'TRANSCRIPT — What Diamond Project is (Prof. BB, July 2026). Diamond Project is a network marketing business: you earn by selling products and by building a team that sells products. There is no salary and no shortcut — income follows value created. Your first job is to understand the compensation plan at a level where you could explain it on a whiteboard in five minutes. Key points: income follows value, not tenure; learn the plan cold before recruiting.',
        },
      ),
      lesson(
        'ipo-2',
        'How commissions flow',
        'Every product order can accrue commissions up the referral chain — this is the financial architectural blueprint: every contributor, from the seller to the mentors above, is rewarded according to the plan. Entries start Pending when an order lands and become Released when approved; Voided or Reversed entries are clawed back. Your ledger in the app is the single source of truth — check it weekly, keep your account qualified with monthly maintenance, and never let a gap break compounding for your whole downline.',
        ['Pending → Released → Paid is the lifecycle', 'Every contributor up the chain is rewarded', 'Your ledger is auditable — check it weekly'],
        [
          { q: 'A new order’s commission starts as…', options: ['Released', 'Pending', 'Reversed'], answer: 1 },
          { q: 'Where is the single source of truth for commissions?', options: ['Your ledger in the app', 'Word of mouth', 'A spreadsheet'], answer: 0 },
          { q: 'A Released commission means the order is…', options: ['Approved and payable', 'Still waiting', 'Cancelled'], answer: 0 },
          { q: 'Voided or reversed entries are…', options: ['Clawed back', 'Doubled as bonus', 'Ignored forever'], answer: 0 },
          { q: 'Commissions accrue…', options: ['Up the referral chain', 'Only to the company', 'Only to the top earner'], answer: 0 },
          { q: 'How often should you check your ledger?', options: ['Weekly', 'Yearly', 'Never'], answer: 0 },
          { q: 'A Pending entry becomes Released when…', options: ['The order is approved', 'You ask your upline', 'The month ends'], answer: 0 },
          { q: 'Who earns from a sale you make?', options: ['You and the mentors above you, per the plan', 'Only you', 'Only the admin'], answer: 0 },
          { q: 'Monthly maintenance keeps…', options: ['Your account qualified and your team paid', 'Nothing important', 'Only your badge'], answer: 0 },
          { q: 'Missing a maintenance month affects…', options: ['Only you', 'Your whole downline’s compounding', 'Nobody'], answer: 1 },
          { q: 'The blueprint is fair because…', options: ['Every contributor is rewarded by the plan', 'The top takes everything', 'Rewards are random'], answer: 0 },
          { q: 'A clawback happens when an order is…', options: ['Voided or reversed', 'Delivered quickly', 'Logged in the CRM'], answer: 0 },
          { q: 'The best proof of what you earned is…', options: ['Your ledger entries', 'Screenshots from others', 'Verbal promises'], answer: 0 },
          { q: 'Your downline’s sales pay you when…', options: ['Your account is qualified and active', 'Always, no matter what', 'Never'], answer: 0 },
          { q: 'If a commission looks wrong, you should…', options: ['Check your ledger and ask your upline', 'Ignore it silently', 'Edit the ledger yourself'], answer: 0 },
        ],
        '/courses/ipo/FINANCIAL-ARCHITECTURAL-BLUEPRINT-GODS-WAY.mp4',
        {
          durationSec: 2764,
          transcript: 'TRANSCRIPT — How commissions flow (Financial Architectural Blueprint, God’s Way). Every product order can accrue commissions up the referral chain: the seller earns, and the mentors above earn according to the compensation plan — no one’s effort goes unrewarded. When an order lands, its commission entry starts as Pending. When the order is approved, the entry becomes Released and payable. If an order is voided or reversed, the entry is clawed back. Your ledger inside the app is the single source of truth: review it weekly. Keep your account qualified with monthly maintenance, because one gap breaks compounding for your whole downline. Key points: Pending becomes Released on approval; voided entries are clawed back; the ledger is auditable; stay qualified every month.',
        },
      ),
      lesson(
        'ipo-3',
        'Your first 30 days',
        'Welcome home, partner — you made the right decision, and you are not walking this road alone. Feeling excited and nervous at the same time is completely normal; every leader you admire, every Kingsman on that stage, started exactly where you are now, with the same butterflies and the same questions. You already did the hardest part, which was starting. The diamond in you is waiting to shine, and the next 30 days are simply about cutting the first facets — small, simple, visible basics, done daily.\n\nWeek one is foundation week: finish this IPO orientation and the Quick Start Guide, set up your profile and landing page, write down 50 prospects, and book your onboarding session with your upline. Your upline is your coach, not your boss — lean on them shamelessly, ask every “silly” question, and let them sit in on your first presentations. Do not wait until you feel ready; readiness comes from action, not before it.\n\nWeeks two to four are rhythm weeks, and rhythm is how you succeed here. Present the opportunity every single day, follow up warmly, and log every touch in the CRM — presented, interested, follow-up required. Attend the weekly team training without fail, review your numbers against your calendar, and keep your contact list growing faster than your excuses. Success in network marketing is not talent; it is basics, repeated daily, in front of witnesses.\n\nConsistency is the whole secret, and consistency is a design choice, not a mood. Decide your business hours, guard them like appointments, and let discipline carry the days motivation skips — that stoic steadiness is the second pillar of this project for a reason. Track your streaks: presentations made, follow-ups kept, touches logged. Momentum in month one predicts year one, because a calendar full of small wins compounds into a business, while waiting for inspiration compounds into nothing.\n\nYou will hear “no” — and a “no” today is not a “no” forever, it is redirection, not rejection. Thank every prospect, note the follow-up date, and move on to the next conversation; the fortune lives in warm, honest follow-up. On the hard days, do not go silent — silence is the only real failure here. Call your upline, show up to training, borrow belief until your own results arrive. Duplication starts with you being duplicable: do the simple things so visibly that your first recruit can copy you without a manual.\n\nAt day 30, stop and look back: orientation done, 50 names listed, daily presenting habit alive, first touches logged, training attended, upline relationship strong. That version of you is already unrecognizable from day one — and it is only the first facet. Hold the rhythm for 90 days and you will not just understand this business, you will be becoming the ultimate version of yourself. One year from now, you will be so glad you started today. Welcome to Diamond Project — now go shine.',
        ['You belong here — every leader started where you are', '50-prospect list in week one', 'Present daily, log everything, lean on your upline'],
        [
          { q: 'Week-one target for prospects listed?', options: ['10', '50', '200'], answer: 1 },
          { q: 'Weeks 2–4 daily habit?', options: ['Present daily and log every touch', 'Wait for inbound leads', 'Only follow up on Mondays'], answer: 0 },
          { q: 'What should a new partner finish first?', options: ['IPO and Quick Start orientation', 'Buying paid ads', 'Recruiting ten people'], answer: 0 },
          { q: 'Feeling nervous as a beginner is…', options: ['Completely normal — every leader felt it', 'A sign you should quit', 'Proof this business is not for you'], answer: 0 },
          { q: 'Your upline is best described as…', options: ['Your coach — lean on them', 'Your boss who gives orders', 'Irrelevant to your success'], answer: 0 },
          { q: 'What should you do when you feel stuck?', options: ['Ask your upline and attend the weekly training', 'Go silent for a month', 'Quit quietly'], answer: 0 },
          { q: 'A “no” from a prospect means…', options: ['Not now — keep following up warmly', 'You have failed', 'Never contact them again'], answer: 0 },
          { q: 'Momentum in month one predicts…', options: ['Year one', 'Nothing at all', 'Only your mood'], answer: 0 },
          { q: 'Duplication starts when you…', options: ['Do the simple basics visibly', 'Earn big first', 'Work alone'], answer: 0 },
          { q: 'Your first presentations should be…', options: ['Done with your upline sitting in', 'Delayed until you feel perfect', 'Done only over text'], answer: 0 },
        ],
        '/courses/ipo/The-First-Step-For-Network-Marketing-Success.mp4',
        {
          durationSec: 545,
          transcript: 'TRANSCRIPT — Your first 30 days (The First Step for Network Marketing Success). Welcome home, partner. You made the right decision, and you are not alone on this journey. Week one: complete your IPO and Quick Start orientation, list 50 prospects, and book your onboarding session with your upline. Weeks two to four: present daily, follow up with warmth, and record every touch in the CRM. Nervousness is normal. Rejection is redirection. Lean on your coach, attend every training, and keep the rhythm — present, follow up, log, repeat. Momentum now compounds into the ultimate version of yourself.',
        },
      ),
    ],
  },
  {
    id: 'qsg',
    title: 'Quick Start Guide (QSG)',
    tagline: 'Your first recruit in 14 days.',
    milestone: 'qsg',
    lessons: [
      lesson(
        'qsg-1',
        'Set up your tools',
        'Complete your profile, set your landing page, and learn the pipeline board. Every prospect goes in the CRM the day you meet them — memory is not a system. Connect your contact list and import leads where the app allows it.',
        ['CRM entry on first contact', 'Profile and landing page live'],
        [
          { q: 'When does a prospect enter the CRM?', options: ['At month-end', 'The day you meet them', 'Only when they buy'], answer: 1 },
          { q: 'What powers your landing page?', options: ['Your completed profile', 'Random generator', 'Admin approval only'], answer: 0 },
        ],
      ),
      lesson(
        'qsg-2',
        'The invitation',
        'Invite with curiosity, not pressure: share what you started, offer a 15-minute look, and book a specific time. Track every invitation outcome in the activity timeline — Contacted, Interested, or Follow-Up Required. No outcome, no progress.',
        ['Book specific times, never "sometime"', 'Log the outcome every time'],
        [
          { q: 'How should you invite?', options: ['With pressure and urgency', 'With curiosity, offer a 15-minute look', 'By sending the price list'], answer: 1 },
          { q: 'An invitation logged without outcome is…', options: ['Enough to count', 'No progress', 'Auto-advanced'], answer: 1 },
        ],
      ),
      lesson(
        'qsg-3',
        'Present and close',
        'Present the opportunity, handle the two real objections (time and money) with stories not arguments, and ask for the decision. Stuck prospects get a follow-up date, never silence. Move every Ready To Join prospect to conversion the same day.',
        ['Ask for the decision explicitly', 'Convert the same day'],
        [
          { q: 'How to handle time/money objections?', options: ['Stories, not arguments', 'Ignore them', 'Lower the price'], answer: 0 },
          { q: 'A Ready-To-Join prospect should be converted…', options: ['Next month', 'The same day', 'After 3 follow-ups'], answer: 1 },
        ],
      ),
      lesson(
        'qsg-4',
        'Onboard your recruit',
        'A recruit without onboarding is a future dropout. Walk them through IPO, help them list their 50, and sit in on their first three presentations. Duplication starts with you being duplicable.',
        ['Onboard within 48 hours', 'Attend their first three presentations'],
        [
          { q: 'Duplication starts when you…', options: ['Skip onboarding', 'Are duplicable — attend their first three presentations', 'Hand them a PDF'], answer: 1 },
          { q: 'When to onboard a new recruit?', options: ['Within 48 hours', 'After a month', 'Only if they ask'], answer: 0 },
        ],
      ),
    ],
  },
  {
    id: 'smo',
    title: 'Standard Method of Operation (SMO)',
    tagline: 'The weekly rhythm that compounds.',
    milestone: 'smo',
    lessons: [
      lesson(
        'smo-1',
        'The non-negotiable week',
        'Every active week contains the same blocks: 5 presentations, 10 follow-ups, 1 team training, ledger review, and goal check-in. The method is standard so results are comparable — if your numbers lag, the calendar tells you why before your upline has to.',
        ['Same blocks every week', 'The calendar diagnoses slumps'],
        [
          { q: 'An active week contains…', options: ['Random tasks', 'Same blocks: 5 presents, 10 follow-ups, training, ledger, goals', 'Only product orders'], answer: 1 },
          { q: 'When numbers lag, what diagnoses it?', options: ['Your upline’s mood', 'Your calendar', 'Luck'], answer: 1 },
        ],
      ),
      lesson(
        'smo-2',
        'Maintenance and compliance',
        'Monthly personal maintenance keeps your accounts qualified and your team paid. Review product maintenance history in the app, keep at least the required accounts active, and never let a month slip silently — one gap breaks compounding for your whole downline.',
        ['Never miss a maintenance month', 'Your gap costs your team too'],
        [
          { q: 'Missing a maintenance month affects…', options: ['Only you', 'Your whole downline’s compounding', 'Nobody'], answer: 1 },
          { q: 'How often to review maintenance?', options: ['Monthly', 'Yearly', 'Never'], answer: 0 },
        ],
      ),
      lesson(
        'smo-3',
        'Leading by the method',
        'Kingsmen run SMO visibly: post your numbers, hold the weekly training, and inspect your leaders’ calendars kindly. The standard only works when leaders submit to it first. Recognition follows consistency, not intensity.',
        ['Run it visibly', 'Inspect kindly, consistently'],
        [
          { q: 'Who must submit to the standard first?', options: ['Leaders', 'Only new partners', 'No one'], answer: 0 },
          { q: 'Recognition follows…', options: ['Intensity', 'Consistency', 'Seniority alone'], answer: 1 },
        ],
      ),
    ],
  },
  {
    id: 'leadership',
    title: 'Leadership Development',
    tagline: 'From Kingsman to Cell Leader.',
    milestone: null,
    lessons: [
      lesson(
        'leadership-1',
        'Raising Kingsmen',
        'You do not promote people; you develop them until promotion is obvious. Each emerging leader needs a goal, a calendar, and a weekly review with you. Track their journey stages the way you track prospects — leadership is a pipeline too.',
        ['Develop until promotion is obvious', 'Weekly reviews, no exceptions'],
        [
          { q: 'Promotion should feel…', options: ['Sudden', 'Obvious after development', 'Based on tenure alone'], answer: 1 },
          { q: 'Each emerging leader needs…', options: ['A goal, a calendar, and a weekly review', 'Just a title', 'Monthly check-ins only'], answer: 0 },
        ],
      ),
      lesson(
        'leadership-2',
        'Running a cell',
        'A cell runs on three meetings: weekly training, monthly recognition, quarterly planning. Keep each under an hour, start on time, end with assignments. Culture is what repeats — design the repetition deliberately.',
        ['Three meetings, each under an hour', 'End with assignments'],
        [
          { q: 'A cell runs on how many recurring meetings?', options: ['One', 'Three: weekly, monthly, quarterly', 'Ten'], answer: 1 },
          { q: 'Each meeting should…', options: ['Run 3+ hours', 'Stay under an hour and end with assignments', 'Have no agenda'], answer: 1 },
        ],
      ),
      lesson(
        'leadership-3',
        'Succession and scale',
        'Your cell outgrows you exactly when your leaders no longer need you in the room. Document the method, hand over the training rotation, and measure yourself by leaders raised, not recruits signed. That is the whole game above Kingsman.',
        ['Measure leaders raised', 'Document, then delegate'],
        [
          { q: 'Above Kingsman you measure yourself by…', options: ['Recruits signed', 'Leaders raised', 'Messages sent'], answer: 1 },
          { q: 'Scaling requires…', options: ['More hours from you', 'Documenting and delegating the training rotation', 'Random assignments'], answer: 1 },
        ],
      ),
    ],
  },
];

export const getCourse = (id) => {
  const course = COURSES.find((c) => c.id === id);
  if (!course) throw new ValidationException('Unknown course');
  return course;
};

export const getCourseWithQuizFull = async (id, training) => {
  const course = getCourse(id);
  if (!training?.getQuiz && !training?.getMedia) return course;
  const withQuiz = await Promise.all(course.lessons.map(async (l) => {
    const override = typeof training.getQuiz === 'function'
      ? await training.getQuiz(course.id, l.id).catch(() => null)
      : null;
    return override ? { ...l, quiz: override } : l;
  }));
  // Media overrides win field-by-field; null/empty falls back to catalog.
  const withMedia = await Promise.all(withQuiz.map(async (l) => {
    const media = typeof training.getMedia === 'function'
      ? await training.getMedia(course.id, l.id).catch(() => null)
      : null;
    if (!media) return l;
    return {
      ...l,
      ...(media.videoUrl ? { videoUrl: media.videoUrl } : {}),
      ...(media.posterUrl ? { posterUrl: media.posterUrl } : {}),
      ...(media.captionsUrl ? { captionsUrl: media.captionsUrl } : {}),
      ...(media.transcript ? { transcript: media.transcript } : {}),
      ...(media.body ? { body: media.body } : {}),
      ...(Array.isArray(media.takeaways) && media.takeaways.length > 0 ? { takeaways: media.takeaways } : {}),
      ...(media.durationSec !== undefined && media.durationSec !== null ? { durationSec: media.durationSec } : {}),
    };
  }));
  return { ...course, lessons: withMedia };
};

/** Public course payload — quiz answers are stripped EXCEPT for lessons
 * whose ids are in `revealFor` (completed lessons: nothing left to cheat,
 * everything to study). Server re-validates on submit regardless. */
export const getCourseWithQuiz = async (id, training, revealFor = []) => {
  const course = await getCourseWithQuizFull(id, training);
  const revealed = new Set(revealFor ?? []);
  return {
    ...course,
    lessons: course.lessons.map((l) => ({
      ...l,
      quiz: (l.quiz ?? []).map((q) => revealed.has(l.id)
        ? { q: q.q, options: q.options, answer: q.answer }
        : { q: q.q, options: q.options }),
    })),
  };
};

export const getLessonWithQuiz = async (courseId, lessonId, training) => {
  const course = await getCourseWithQuizFull(courseId, training);
  const lessonEntry = course.lessons.find((l) => l.id === lessonId);
  if (!lessonEntry) throw new ValidationException('Unknown lesson');
  return { course, lesson: lessonEntry };
};

export const getLesson = (courseId, lessonId) => {
  const course = getCourse(courseId);
  const lessonEntry = course.lessons.find((l) => l.id === lessonId);
  if (!lessonEntry) throw new ValidationException('Unknown lesson');
  return { course, lesson: lessonEntry };
};

/**
 * Pure progress math — unit-testable without Mongo.
 * Unknown ids in `completed` are ignored (catalog may grow).
 */
export const courseProgress = (course, completedIds = []) => {
  const known = new Set(course.lessons.map((l) => l.id));
  const done = [...new Set(completedIds)].filter((id) => known.has(id));
  return {
    done: done.length,
    total: course.lessons.length,
    percent: course.lessons.length > 0 ? Math.round((done.length / course.lessons.length) * 100) : 100,
    certified: done.length === course.lessons.length && course.lessons.length > 0,
    completedIds: done,
  };
};

export const catalogSummaries = () => COURSES.map(({ id, title, tagline, milestone, lessons }) => ({
  id, title, tagline, milestone, lessons: lessons.length,
}));
