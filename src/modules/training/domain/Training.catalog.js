import { ValidationException } from '../../../shared/domain/AppError.js';

/**
 * Course catalog — the takable IPO / QSG / SMO / Leadership path.
 * Content lives here (versioned with code); progress lives in Mongo.
 * Completing a ladder course auto-checks its progression milestone.
 */

const lesson = (id, title, body, takeaways = [], quiz = []) => ({ id, title, body, takeaways, quiz });

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
      ),
      lesson(
        'ipo-2',
        'How commissions flow',
        'Every product order can accrue commissions up the referral chain. Entries start Pending when an order lands and become Released when approved. Voided or reversed entries are clawed back. Your ledger in the app is the single source of truth — check it weekly, not yearly.',
        ['Pending → Released → Paid is the lifecycle', 'Your ledger is auditable — use it'],
        [
          { q: 'A new order’s commission starts as…', options: ['Released', 'Pending', 'Reversed'], answer: 1 },
          { q: 'Where is the single source of truth for commissions?', options: ['Your ledger in the app', 'Word of mouth', 'A spreadsheet'], answer: 0 },
        ],
      ),
      lesson(
        'ipo-3',
        'Your first 30 days',
        'Week one: finish this orientation and QSG, list 50 prospects, and book your onboarding session. Weeks two to four: present daily, log every touch in the CRM, and close your first recruit. Momentum in month one predicts year one.',
        ['50-prospect list in week one', 'Present daily, log everything'],
        [
          { q: 'Week-one target for prospects listed?', options: ['10', '50', '200'], answer: 1 },
          { q: 'Weeks 2–4 daily habit?', options: ['Present daily and log every touch', 'Wait for inbound leads', 'Only follow up on Mondays'], answer: 0 },
        ],
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

export const getCourseWithQuiz = async (id, training) => {
  const course = getCourse(id);
  if (!training?.getQuiz) return course;
  const withQuiz = await Promise.all(course.lessons.map(async (l) => {
    const override = await training.getQuiz(course.id, l.id).catch(() => null);
    return override ? { ...l, quiz: override } : l;
  }));
  return { ...course, lessons: withQuiz };
};

export const getLessonWithQuiz = async (courseId, lessonId, training) => {
  const course = await getCourseWithQuiz(courseId, training);
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
