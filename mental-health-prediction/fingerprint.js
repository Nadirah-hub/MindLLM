/**
 * Personalized Mental Pattern Fingerprint
 * Stores emotion vectors from past conversations, detects repeating stress patterns,
 * and surfaces gentle alerts when current input deviates from the user's normal pattern.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROFILES_DIR = path.join(__dirname, 'user_profiles');
const MIN_MESSAGES_FOR_BASELINE = 5;
const MIN_MESSAGES_FOR_DEVIATION = 5;
const MAX_MESSAGES_STORED = 200;
const MOOD_ORDER = { positive: 0, neutral: 1, low: 2, anxious: 3, angry: 4 };

// Stress-related words (lowercase) – presence increases stress signal
const STRESS_WORDS = [
  'stress', 'stressed', 'anxious', 'anxiety', 'worried', 'worry', 'overwhelmed', 'panic',
  'scared', 'afraid', 'nervous', 'tense', 'pressure', 'burnout', 'exhausted', 'dread',
  'hopeless', 'lonely', 'sad', 'down', 'depressed', 'angry', 'frustrated', 'irritated',
  'can\'t', 'cannot', 'struggling', 'stuck', 'failed', 'failure', 'terrible', 'awful',
  'hate', 'worst', 'never', 'always', 'nothing', 'everything', 'should', 'must',
];

// Topic keywords (lowercase) – map text to broad topics for "usual tone per topic"
const TOPIC_KEYWORDS = {
  work: ['work', 'job', 'boss', 'office', 'deadline', 'colleague', 'career', 'meeting', 'project'],
  exams: ['exam', 'exams', 'test', 'tests', 'study', 'studying', 'grades', 'school', 'college', 'university', 'assignment'],
  family: ['family', 'parent', 'parents', 'mom', 'dad', 'sibling', 'brother', 'sister', 'child', 'kids'],
  relationship: ['relationship', 'partner', 'boyfriend', 'girlfriend', 'spouse', 'dating', 'breakup', 'fight', 'argument'],
  sleep: ['sleep', 'insomnia', 'tired', 'exhausted', 'rest', 'waking', 'dreams'],
  health: ['health', 'sick', 'pain', 'doctor', 'medical', 'body', 'ill'],
  money: ['money', 'bills', 'debt', 'financial', 'pay', 'salary', 'cost'],
  future: ['future', 'career', 'goal', 'dream', 'plan', 'decision', 'what if'],
};

/**
 * Detect mood from text (aligned with frontend logic).
 * @param {string} text
 * @returns {'positive'|'neutral'|'low'|'anxious'|'angry'}
 */
function detectMood(text) {
  if (!text || typeof text !== 'string') return 'neutral';
  const t = text.trim().toLowerCase();
  const positiveWords = ['happy', 'good', 'okay', 'ok', 'excited', 'grateful', 'fine', 'better'];
  const anxiousWords = ['anxious', 'anxiety', 'panic', 'panicking', 'overwhelmed'];
  const lowWords = ['sad', 'down', 'depressed', 'scared', 'worried', 'lonely', 'tired', 'hopeless'];
  const angryWords = ['angry', 'mad', 'furious', 'rage', 'pissed', 'irritated', 'frustrated', 'annoyed', 'hate'];

  if (angryWords.some((w) => t.includes(w))) return 'angry';
  if (positiveWords.some((w) => t.includes(w))) return 'positive';
  if (anxiousWords.some((w) => t.includes(w))) return 'anxious';
  if (lowWords.some((w) => t.includes(w))) return 'low';
  return 'neutral';
}

/**
 * Count stress words and extract topics from text.
 */
function extractFeatures(text) {
  if (!text || typeof text !== 'string') {
    return { mood: 'neutral', stressWordCount: 0, messageLength: 0, wordCount: 0, topics: [] };
  }
  const t = text.trim().toLowerCase();
  const words = t.split(/\s+/).filter(Boolean);
  let stressWordCount = 0;
  const seen = new Set();
  for (const w of words) {
    const normalized = w.replace(/[^\w']/g, '');
    if (STRESS_WORDS.some((sw) => normalized.includes(sw) || sw.includes(normalized)) && !seen.has(normalized)) {
      seen.add(normalized);
      stressWordCount++;
    }
  }
  const topics = [];
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some((kw) => t.includes(kw))) topics.push(topic);
  }
  return {
    mood: detectMood(text),
    stressWordCount,
    messageLength: text.length,
    wordCount: words.length,
    topics: topics.length ? topics : ['general'],
  };
}

/**
 * Ensure profiles directory exists.
 */
async function ensureProfilesDir() {
  try {
    await fs.mkdir(PROFILES_DIR, { recursive: true });
  } catch (_) {}
}

/**
 * Load user profile from disk.
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
async function loadProfile(userId) {
  if (!userId || typeof userId !== 'string') return null;
  await ensureProfilesDir();
  const filePath = path.join(PROFILES_DIR, `${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (_) {
    return null;
  }
}

/**
 * Save user profile to disk.
 * @param {string} userId
 * @param {object} profile
 */
async function saveProfile(userId, profile) {
  if (!userId || typeof userId !== 'string') return;
  await ensureProfilesDir();
  const filePath = path.join(PROFILES_DIR, `${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
  profile.updatedAt = new Date().toISOString();
  await fs.writeFile(filePath, JSON.stringify(profile, null, 2), 'utf8');
}

/**
 * Compute baseline from last N message vectors (mood distribution, avg stress, per-topic typical mood).
 * @param {Array<{ mood: string, stressWordCount: number, topics: string[] }>} messages
 */
function computeBaseline(messages) {
  const recent = messages.slice(-Math.min(100, messages.length));
  const moodCounts = { positive: 0, neutral: 0, low: 0, anxious: 0, angry: 0 };
  let totalStress = 0;
  const topicMoods = {}; // topic -> list of moods when that topic was mentioned

  for (const m of recent) {
    moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1;
    totalStress += m.stressWordCount || 0;
    for (const topic of m.topics || []) {
      if (!topicMoods[topic]) topicMoods[topic] = [];
      topicMoods[topic].push(m.mood);
    }
  }

  const total = recent.length;
  const moodDistribution = {};
  for (const [mood, count] of Object.entries(moodCounts)) {
    moodDistribution[mood] = count / total;
  }

  const topicTypicalMood = {};
  for (const [topic, moods] of Object.entries(topicMoods)) {
    const counts = {};
    for (const m of moods) counts[m] = (counts[m] || 0) + 1;
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    topicTypicalMood[topic] = dominant ? dominant[0] : 'neutral';
  }

  return {
    moodDistribution,
    avgStressWordCount: total ? totalStress / total : 0,
    topicTypicalMood,
    sampleSize: total,
  };
}

/**
 * Check if current mood is "worse" than baseline mood (higher in MOOD_ORDER).
 */
function isMoodWorseThan(currentMood, baselineMood) {
  const a = MOOD_ORDER[currentMood] ?? 1;
  const b = MOOD_ORDER[baselineMood] ?? 1;
  return a > b;
}

/**
 * Detect deviation: user usually sounds calmer for this topic / in general; today is different.
 * @param {{ mood: string, stressWordCount: number, topics: string[] }} current
 * @param {{ moodDistribution: object, avgStressWordCount: number, topicTypicalMood: object }} baseline
 * @returns {{ deviation: boolean, message: string|null }}
 */
function detectDeviation(current, baseline) {
  if (!baseline || baseline.sampleSize < MIN_MESSAGES_FOR_DEVIATION) return { deviation: false, message: null };

  const topics = current.topics && current.topics.length ? current.topics : ['general'];
  if (topics.includes('general') && current.topics?.length) topics.push(...current.topics.filter((t) => t !== 'general'));

  const usualMoodForTopic = topics.map((t) => baseline.topicTypicalMood[t] || 'neutral')[0] || 'neutral';
  const moodWorse = isMoodWorseThan(current.mood, usualMoodForTopic);
  const stressSpike = baseline.avgStressWordCount >= 0 && current.stressWordCount > baseline.avgStressWordCount + 1;

  if (!moodWorse && !stressSpike) return { deviation: false, message: null };

  const topicLabel = topics[0] === 'general' ? 'things' : topics[0];
  const humanTopic = {
    work: 'work',
    exams: 'exams or school',
    family: 'family',
    relationship: 'relationships',
    sleep: 'sleep',
    health: 'health',
    money: 'money',
    future: 'the future',
    general: 'things',
  }[topicLabel] || topicLabel;

  const message =
    moodWorse && usualMoodForTopic !== 'neutral'
      ? `You usually sound calmer when talking about ${humanTopic}. Today your tone seems different. Do you want to talk about it?`
      : stressSpike && moodWorse
        ? `I notice this message feels heavier than how you usually write. I'm here if you want to go deeper.`
        : stressSpike
          ? `You're using more stress-related words than usual. Want to unpack what's going on?`
          : null;

  return { deviation: !!message, message: message || null };
}

/**
 * Build a short profile summary for personalizing the AI (tone + context).
 * @param {Array<{ mood: string, topics: string[] }>} messages
 * @returns {string}
 */
function buildProfileSummary(messages) {
  if (!messages || messages.length < 3) return '';
  const recent = messages.slice(-30);
  const moodCounts = { positive: 0, neutral: 0, low: 0, anxious: 0, angry: 0 };
  const topicCounts = {};

  for (const m of recent) {
    moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1;
    for (const t of m.topics || []) {
      topicCounts[t] = (topicCounts[t] || 0) + 1;
    }
  }

  const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
  const topTopics = Object.entries(topicCounts)
    .filter(([k]) => k !== 'general')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);

  const parts = [];
  if (dominantMood !== 'neutral') parts.push(`Often expresses ${dominantMood} feelings.`);
  if (topTopics.length) parts.push(`Frequently talks about: ${topTopics.join(', ')}.`);
  parts.push('Keep responses warm, concise, and adaptive to their tone.');
  return parts.join(' ');
}

/**
 * Get or create profile, compute deviation/summary from *existing* history, then append current message and save.
 * @param {string} userId - optional; if missing, will be generated
 * @param {string} inputText - current user message
 * @returns {Promise<{ userId: string, patternDeviation: boolean, patternMessage: string|null, profileSummary: string, newUserId?: boolean }>}
 */
async function updateFingerprint(userId, inputText) {
  const features = extractFeatures(inputText);
  let profile = userId ? await loadProfile(userId) : null;
  let newUserId = false;

  if (!userId) {
    userId = 'anon_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
    newUserId = true;
  }

  if (!profile) {
    profile = {
      userId,
      messages: [],
      baseline: null,
      summary: '',
      updatedAt: new Date().toISOString(),
    };
  }

  const messages = profile.messages || [];
  const baseline =
    messages.length >= MIN_MESSAGES_FOR_BASELINE
      ? computeBaseline(messages)
      : profile.baseline || null;

  // Deviation vs *past* baseline (before adding this message)
  const deviationResult = baseline ? detectDeviation(features, baseline) : { deviation: false, message: null };
  const profileSummary = buildProfileSummary(messages);

  const newEntry = {
    mood: features.mood,
    stressWordCount: features.stressWordCount,
    messageLength: features.messageLength,
    wordCount: features.wordCount,
    topics: features.topics,
    timestamp: new Date().toISOString(),
  };
  messages.push(newEntry);
  if (messages.length > MAX_MESSAGES_STORED) messages.splice(0, messages.length - MAX_MESSAGES_STORED);
  profile.messages = messages;
  profile.baseline = messages.length >= MIN_MESSAGES_FOR_BASELINE ? computeBaseline(messages) : baseline;
  profile.summary = buildProfileSummary(messages);

  await saveProfile(userId, profile);

  return {
    userId,
    newUserId,
    patternDeviation: deviationResult.deviation,
    patternMessage: deviationResult.message,
    profileSummary,
  };
}

export {
  loadProfile,
  saveProfile,
  extractFeatures,
  detectMood,
  computeBaseline,
  detectDeviation,
  buildProfileSummary,
  updateFingerprint,
  MIN_MESSAGES_FOR_BASELINE,
  MIN_MESSAGES_FOR_DEVIATION,
};
