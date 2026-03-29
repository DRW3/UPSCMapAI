// Shared types for the Duolingo-style mobile learning journey

export type NodeState = 'locked' | 'available' | 'started' | 'completed'
export type CrownLevel = 0 | 1 | 2 | 3 | 4 | 5

export interface TopicProgress {
  state: NodeState
  crownLevel: CrownLevel   // 0 = not started, 1-5 = mastery levels
  xpEarned: number
  questionsAnswered: number
  correctAnswers: number
  lastPracticed: string | null  // ISO date
}

// ── Daily Goal ────────────────────────────────────────────────────────────────

export type DailyGoalTier = 'casual' | 'regular' | 'serious' | 'intense'

export interface DailyGoalConfig {
  tier: DailyGoalTier
  xpTarget: number
  label: string
  icon: string
}

export const DAILY_GOALS: Record<DailyGoalTier, DailyGoalConfig> = {
  casual:  { tier: 'casual',  xpTarget: 30,  label: 'Casual',  icon: '🌱' },
  regular: { tier: 'regular', xpTarget: 50,  label: 'Regular', icon: '📖' },
  serious: { tier: 'serious', xpTarget: 100, label: 'Serious', icon: '🔥' },
  intense: { tier: 'intense', xpTarget: 150, label: 'Intense', icon: '⚡' },
}

// ── Achievements ──────────────────────────────────────────────────────────────

export type AchievementCategory = 'milestone' | 'streak' | 'mastery' | 'performance'

export interface AchievementDef {
  id: string
  title: string
  description: string
  icon: string
  category: AchievementCategory
  // condition is checked by checkAchievements() function
}

export interface UnlockedAchievement {
  id: string
  unlockedAt: string // ISO date
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Milestones
  { id: 'first-topic',      title: 'First Steps',        description: 'Complete your first topic',                        icon: '🎯', category: 'milestone' },
  { id: 'ten-topics',       title: 'Getting Serious',    description: 'Complete 10 topics',                               icon: '📚', category: 'milestone' },
  { id: 'twentyfive-topics',title: 'Quarter Way',        description: 'Complete 25 topics',                               icon: '🏔️', category: 'milestone' },
  { id: 'fifty-topics',     title: 'Half Century',       description: 'Complete 50 topics',                               icon: '⭐', category: 'milestone' },
  { id: 'hundred-topics',   title: 'Centurion',          description: 'Complete 100 topics',                              icon: '💯', category: 'milestone' },
  { id: 'first-subject',    title: 'Subject Cleared',    description: 'Complete all topics in a subject',                 icon: '🎓', category: 'milestone' },
  { id: 'five-hundred-xp',  title: 'XP Hunter',          description: 'Earn 500 total XP',                               icon: '⚡', category: 'milestone' },
  { id: 'two-thousand-xp',  title: 'XP Machine',         description: 'Earn 2000 total XP',                              icon: '🔋', category: 'milestone' },
  { id: 'fifty-gems',       title: 'Gem Collector',      description: 'Collect 50 gems',                                 icon: '💎', category: 'milestone' },
  // Streaks
  { id: 'streak-3',         title: 'Getting Started',    description: 'Maintain a 3-day study streak',                    icon: '🔥', category: 'streak' },
  { id: 'streak-7',         title: 'One Week Strong',    description: 'Maintain a 7-day study streak',                    icon: '🗓️', category: 'streak' },
  { id: 'streak-14',        title: 'Fortnight Focus',    description: 'Maintain a 14-day study streak',                   icon: '💪', category: 'streak' },
  { id: 'streak-30',        title: 'Monthly Mastery',    description: 'Maintain a 30-day study streak',                   icon: '🏆', category: 'streak' },
  { id: 'streak-100',       title: 'Unstoppable',        description: 'Maintain a 100-day study streak',                  icon: '👑', category: 'streak' },
  // Mastery
  { id: 'first-crown',      title: 'First Crown',        description: 'Reach Crown Level 1 on any topic',                icon: '👑', category: 'mastery' },
  { id: 'crown-3',          title: 'Rising Master',      description: 'Reach Crown Level 3 on any topic',                icon: '🌟', category: 'mastery' },
  { id: 'crown-5',          title: 'Legendary',          description: 'Reach Crown Level 5 (Legendary) on any topic',    icon: '💎', category: 'mastery' },
  { id: 'five-crowns',      title: 'Crown Collector',    description: 'Have 5 topics at Crown Level 3+',                 icon: '🏅', category: 'mastery' },
  { id: 'ten-crowns',       title: 'Crown Hoarder',      description: 'Have 10 topics at Crown Level 3+',                icon: '🎖️', category: 'mastery' },
  // Performance
  { id: 'first-perfect',    title: 'Flawless',           description: 'Get a perfect score on a practice session',        icon: '✨', category: 'performance' },
  { id: 'five-perfects',    title: 'Perfectionist',      description: 'Get 5 perfect scores',                            icon: '🎯', category: 'performance' },
  { id: 'fifty-correct',    title: 'Knowledge Base',     description: 'Answer 50 questions correctly',                    icon: '🧠', category: 'performance' },
  { id: 'hundred-correct',  title: 'Scholar',            description: 'Answer 100 questions correctly',                   icon: '📖', category: 'performance' },
  { id: 'two-fifty-correct',title: 'Walking Encyclopedia',description: 'Answer 250 questions correctly',                  icon: '🏛️', category: 'performance' },
  { id: 'daily-goal-met',   title: 'Goal Getter',        description: 'Meet your daily XP goal',                          icon: '🎯', category: 'performance' },
  { id: 'daily-goal-7',     title: 'Goal Streak',        description: 'Meet your daily XP goal 7 days in a row',          icon: '🔥', category: 'performance' },
]

// ── Study Calendar ────────────────────────────────────────────────────────────

export interface StudyDay {
  date: string       // YYYY-MM-DD
  xpEarned: number
  questionsAnswered: number
  goalMet: boolean
}

// ── Journey Progress (extended) ───────────────────────────────────────────────

export interface JourneyProgress {
  topics: Record<string, TopicProgress>
  totalXp: number
  streak: number
  lastStudyDate: string | null    // ISO date
  hearts: number                   // max 5, refill over time
  heartsLastRefill: string | null  // ISO date
  gems: number                     // earned from perfect scores, streaks
  // Daily goal
  dailyGoalTier: DailyGoalTier
  todayXp: number
  todayDate: string | null         // YYYY-MM-DD — resets when date changes
  goalStreakDays: number            // consecutive days meeting goal
  // Achievements
  achievements: UnlockedAchievement[]
  perfectScores: number            // total perfect practice sessions
  // Study calendar
  studyCalendar: StudyDay[]        // last 90 days max
}

export const DEFAULT_PROGRESS: JourneyProgress = {
  topics: {},
  totalXp: 0,
  streak: 0,
  lastStudyDate: null,
  hearts: 5,
  heartsLastRefill: null,
  gems: 0,
  dailyGoalTier: 'regular',
  todayXp: 0,
  todayDate: null,
  goalStreakDays: 0,
  achievements: [],
  perfectScores: 0,
  studyCalendar: [],
}

export const DEFAULT_TOPIC_PROGRESS: TopicProgress = {
  state: 'locked',
  crownLevel: 0,
  xpEarned: 0,
  questionsAnswered: 0,
  correctAnswers: 0,
  lastPracticed: null,
}

// XP rewards
export const XP_PER_CORRECT = 10
export const XP_PER_PERFECT_ROUND = 25   // bonus for all correct
export const XP_PER_CROWN_LEVEL = 50     // bonus when leveling up crown
export const QUESTIONS_PER_CROWN = 5     // correct answers needed to level up

// Crown colors by level
export const CROWN_COLORS: Record<CrownLevel, string> = {
  0: '#4b5563',   // gray (not started)
  1: '#a78bfa',   // purple (level 1)
  2: '#60a5fa',   // blue (level 2)
  3: '#34d399',   // green (level 3)
  4: '#fbbf24',   // gold (level 4)
  5: '#f472b6',   // legendary pink (level 5)
}

// Node positions along the winding path (repeating pattern)
export const PATH_POSITIONS: Array<{ x: number; curve: 'left' | 'center' | 'right' }> = [
  { x: 0.5,  curve: 'center' },
  { x: 0.3,  curve: 'left' },
  { x: 0.2,  curve: 'left' },
  { x: 0.35, curve: 'left' },
  { x: 0.5,  curve: 'center' },
  { x: 0.7,  curve: 'right' },
  { x: 0.8,  curve: 'right' },
  { x: 0.65, curve: 'right' },
]

// ── Achievement Checker ────────────────────────────────────────────────────────

import type { LearningSubject } from '@/data/syllabus'

export function checkAchievements(
  progress: JourneyProgress,
  subjects: LearningSubject[],
): string[] {
  const unlocked = new Set(progress.achievements.map(a => a.id))
  const newlyUnlocked: string[] = []

  const topics = progress.topics
  const completedCount = Object.values(topics).filter(t => t.state === 'completed').length
  const totalCorrect = Object.values(topics).reduce((s, t) => s + t.correctAnswers, 0)
  const maxCrown = Math.max(0, ...Object.values(topics).map(t => t.crownLevel))
  const crowns3Plus = Object.values(topics).filter(t => t.crownLevel >= 3).length

  function check(id: string, condition: boolean) {
    if (!unlocked.has(id) && condition) newlyUnlocked.push(id)
  }

  // Milestones
  check('first-topic',       completedCount >= 1)
  check('ten-topics',        completedCount >= 10)
  check('twentyfive-topics', completedCount >= 25)
  check('fifty-topics',      completedCount >= 50)
  check('hundred-topics',    completedCount >= 100)
  check('five-hundred-xp',   progress.totalXp >= 500)
  check('two-thousand-xp',   progress.totalXp >= 2000)
  check('fifty-gems',        progress.gems >= 50)

  // Check if any full subject is completed
  for (const subject of subjects) {
    const allTopicIds = subject.units.flatMap(u => u.topics.map(t => t.id))
    const allDone = allTopicIds.length > 0 && allTopicIds.every(id => topics[id]?.state === 'completed')
    if (allDone) { check('first-subject', true); break }
  }

  // Streaks
  check('streak-3',   progress.streak >= 3)
  check('streak-7',   progress.streak >= 7)
  check('streak-14',  progress.streak >= 14)
  check('streak-30',  progress.streak >= 30)
  check('streak-100', progress.streak >= 100)

  // Mastery
  check('first-crown', maxCrown >= 1)
  check('crown-3',     maxCrown >= 3)
  check('crown-5',     maxCrown >= 5)
  check('five-crowns', crowns3Plus >= 5)
  check('ten-crowns',  crowns3Plus >= 10)

  // Performance
  check('first-perfect',     progress.perfectScores >= 1)
  check('five-perfects',     progress.perfectScores >= 5)
  check('fifty-correct',     totalCorrect >= 50)
  check('hundred-correct',   totalCorrect >= 100)
  check('two-fifty-correct', totalCorrect >= 250)

  // Daily goal
  const today = new Date().toISOString().slice(0, 10)
  const goalXp = DAILY_GOALS[progress.dailyGoalTier].xpTarget
  const goalMet = progress.todayDate === today && progress.todayXp >= goalXp
  check('daily-goal-met', goalMet)
  check('daily-goal-7',   progress.goalStreakDays >= 7)

  return newlyUnlocked
}
