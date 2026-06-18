/**
 * Safety Escalation & Human-Help Trigger
 * Detects high-risk inputs (self-harm, panic, crisis) and returns safe responses + helplines.
 */

// High-risk patterns (lowercase). Add variants as needed.
const HIGH_RISK_PATTERNS = [
  // Self-harm / suicide
  /\b(kill|hurting|hurt)\s+(my)?self\b/i,
  /\b(end|take)\s+my\s+life\b/i,
  /\bsuicid(e|al|ing)\b/i,
  /\bself[\s-]?harm\b/i,
  /\bcutting\s+(my)?self\b/i,
  /\bwant\s+to\s+die\b/i,
  /\bdon'?t\s+want\s+to\s+live\b/i,
  /\bbetter\s+off\s+dead\b/i,
  /\bno\s+reason\s+to\s+live\b/i,
  /\boverdose\s+(on|myself)\b/i,
  /\bhanging\s+my(self)?\b/i,
  /\bplan(n)?ing\s+to\s+(die|end it)\b/i,
  /\bgoodbye\s+(forever|world)\b/i,
  // Panic / acute crisis
  /\bpanic(king)?\s+(attack|right now)\b/i,
  /\bcan'?t\s+breathe\b/i,
  /\bhaving\s+(a\s+)?panic\b/i,
  /\bemergency\s+(help|now)\b/i,
  /\bgoing\s+to\s+(hurt|kill)\s+my(self)?\b/i,
  /\bright\s+now\s+(want|going)\s+to\b/i,
  /\bcrisis\s+(line|hotline|help)\b/i,
  /\bimminent\s+(danger|risk)\b/i,
  /\babout\s+to\s+(harm|end)\b/i,
];

// Safe, supportive response when high-risk is detected (no clinical advice, encourage professional help).
const SAFE_RESPONSE = `I hear that you're going through something very difficult, and I'm glad you're reaching out.

**Your safety matters.** I'm not able to provide crisis or emergency support. Please reach out to someone who can help right away—a crisis line, a trusted person, or emergency services in your area.

You don't have to face this alone. The resources below are available 24/7 in many regions.`;

// Helplines and resources (region / name / number / optional link).
const HELPLINES = [
  { region: 'International', name: 'International Association for Suicide Prevention', number: 'Find your country: https://www.iasp.info/resources/Crisis_Centres/', url: 'https://www.iasp.info/resources/Crisis_Centres/' },
  { region: 'USA', name: '988 Suicide & Crisis Lifeline', number: '988', tel: '988', url: 'https://988lifeline.org/' },
  { region: 'USA', name: 'Crisis Text Line', number: 'Text HOME to 741741', url: 'https://www.crisistextline.org/' },
  { region: 'UK', name: 'Samaritans', number: '116 123', tel: '116123', url: 'https://www.samaritans.org/' },
  { region: 'UK', name: 'Shout (Crisis Text)', number: 'Text SHOUT to 85258', url: 'https://giveusashout.org/' },
  { region: 'India', name: 'Vandrevala Foundation', number: '1860-2662-345 / 1800-2333-330', tel: '18602662345', url: 'https://www.vandrevalafoundation.com/' },
  { region: 'India', name: 'iCall (TISS)', number: '9152987821', tel: '9152987821', url: 'https://icall.psychology.tiss.edu/' },
  { region: 'Canada', name: 'Canada Suicide Prevention Service', number: '1-833-456-4566', tel: '18334564566', url: 'https://www.crisisservicescanada.ca/' },
  { region: 'Australia', name: 'Lifeline', number: '13 11 14', tel: '131114', url: 'https://www.lifeline.org.au/' },
  { region: 'Australia', name: 'Beyond Blue', number: '1300 22 4636', tel: '1300224636', url: 'https://www.beyondblue.org.au/' },
  { region: 'Germany', name: 'Telefonseelsorge', number: '0800 111 0 111', tel: '08001110111', url: 'https://www.telefonseelsorge.de/' },
];

/**
 * Returns true if the text suggests high risk (self-harm, panic, crisis).
 * @param {string} text - User input
 * @returns {boolean}
 */
function isHighRisk(text) {
  if (!text || typeof text !== 'string') return false;
  const normalized = text.trim().toLowerCase();
  if (normalized.length < 3) return false;
  return HIGH_RISK_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Get safe response and helplines for escalation.
 * @returns {{ safeMessage: string, helplines: Array<{region:string, name:string, number:string, tel?:string, url?:string}> }}
 */
function getSafetyPayload() {
  return {
    safeMessage: SAFE_RESPONSE,
    helplines: HELPLINES.map(({ region, name, number, tel, url }) => ({
      region,
      name,
      number,
      ...(tel && { tel }),
      ...(url && { url }),
    })),
  };
}

export { isHighRisk, getSafetyPayload, HELPLINES };
