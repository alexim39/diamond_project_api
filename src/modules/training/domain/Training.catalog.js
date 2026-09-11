import { ValidationException } from '../../../shared/domain/AppError.js';

/**
 * Course catalog — the takable IPO / QSG / SMO / Leadership path.
 * Content lives here (versioned with code); progress lives in Mongo.
 * Completing a ladder course auto-checks its progression milestone.
 */

const lesson = (id, title, body, takeaways = []) => ({ id, title, body, takeaways });

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
      ),
      lesson(
        'ipo-2',
        'How commissions flow',
        'Every product order can accrue commissions up the referral chain. Entries start Pending when an order lands and become Released when approved. Voided or reversed entries are clawed back. Your ledger in the app is the single source of truth — check it weekly, not yearly.',
        ['Pending → Released → Paid is the lifecycle', 'Your ledger is auditable — use it'],
      ),
      lesson(
        'ipo-3',
        'Your first 30 days',
        'Week one: finish this orientation and QSG, list 50 prospects, and book your onboarding session. Weeks two to four: present daily, log every touch in the CRM, and close your first recruit. Momentum in month one predicts year one.',
        ['50-prospect list in week one', 'Present daily, log everything'],
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
      ),
      lesson(
        'qsg-2',
        'The invitation',
        'Invite with curiosity, not pressure: share what you started, offer a 15-minute look, and book a specific time. Track every invitation outcome in the activity timeline — Contacted, Interested, or Follow-Up Required. No outcome, no progress.',
        ['Book specific times, never "sometime"', 'Log the outcome every time'],
      ),
      lesson(
        'qsg-3',
        'Present and close',
        'Present the opportunity, handle the two real objections (time and money) with stories not arguments, and ask for the decision. Stuck prospects get a follow-up date, never silence. Move every Ready To Join prospect to conversion the same day.',
        ['Ask for the decision explicitly', 'Convert the same day'],
      ),
      lesson(
        'qsg-4',
        'Onboard your recruit',
        'A recruit without onboarding is a future dropout. Walk them through IPO, help them list their 50, and sit in on their first three presentations. Duplication starts with you being duplicable.',
        ['Onboard within 48 hours', 'Attend their first three presentations'],
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
      ),
      lesson(
        'smo-2',
        'Maintenance and compliance',
        'Monthly personal maintenance keeps your accounts qualified and your team paid. Review product maintenance history in the app, keep at least the required accounts active, and never let a month slip silently — one gap breaks compounding for your whole downline.',
        ['Never miss a maintenance month', 'Your gap costs your team too'],
      ),
      lesson(
        'smo-3',
        'Leading by the method',
        'Kingsmen run SMO visibly: post your numbers, hold the weekly training, and inspect your leaders’ calendars kindly. The standard only works when leaders submit to it first. Recognition follows consistency, not intensity.',
        ['Run it visibly', 'Inspect kindly, consistently'],
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
      ),
      lesson(
        'leadership-2',
        'Running a cell',
        'A cell runs on three meetings: weekly training, monthly recognition, quarterly planning. Keep each under an hour, start on time, end with assignments. Culture is what repeats — design the repetition deliberately.',
        ['Three meetings, each under an hour', 'End with assignments'],
      ),
      lesson(
        'leadership-3',
        'Succession and scale',
        'Your cell outgrows you exactly when your leaders no longer need you in the room. Document the method, hand over the training rotation, and measure yourself by leaders raised, not recruits signed. That is the whole game above Kingsman.',
        ['Measure leaders raised', 'Document, then delegate'],
      ),
    ],
  },
];

export const getCourse = (id) => {
  const course = COURSES.find((c) => c.id === id);
  if (!course) throw new ValidationException('Unknown course');
  return course;
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
