import express from 'express';
import cors from 'cors';
import axios from 'axios';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { isHighRisk, getSafetyPayload } from './safety.js';
import { updateFingerprint } from './fingerprint.js';
import { register, login, saveChat, getChatHistory } from './auth.js';
import { requireAuth } from './middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env first, then mentalapi.env if GROQ_API_KEY still missing
dotenv.config({ path: path.join(__dirname, '.env') });
if (!process.env.GROQ_API_KEY) {
  dotenv.config({ path: path.join(__dirname, 'mentalapi.env') });
}

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Root: so visiting http://localhost:5000 shows a message instead of "Cannot GET /"
app.get('/', (req, res) => {
  res.send(
    '<p>Mental Health API is running.</p><p>Use the app at <a href="http://localhost:3000">http://localhost:3000</a></p><p>Endpoints: POST /auth/register, POST /auth/login, POST /predict (auth required), GET /resources (auth required).</p>'
  );
});

// ---- Auth: no auth required for these ----
app.post('/auth/register', async (req, res) => {
  let message = 'Registration failed. Please try again.';
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }
    const result = await register(username, password);
    if (!result || typeof result !== 'object') {
      return res.status(400).json({ message });
    }
    if (!result.success) {
      return res.status(400).json({ message: result.message || message });
    }
    return res.status(201).json({ message: 'Account created. You may sign in.' });
  } catch (err) {
    console.error('Register error:', err.message);
    return res.status(400).json({ message });
  }
});

app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }
  try {
    const result = await login(username, password);
    if (!result.success) {
      return res.status(401).json({ message: result.message });
    }
    res.json({ token: result.token, username: result.username });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Authentication failed.' });
  }
});

// ---- Protected routes: authentication checked at start of every interaction ----
// Safety escalation: detect high-risk input before any model call
app.post('/predict', requireAuth, async (req, res) => {
  const { inputText, modelName } = req.body;
  const userId = req.user.username;

  if (!inputText || typeof inputText !== 'string') {
    return res.status(400).json({ message: 'inputText is required' });
  }

  try {
    // 1) Safety check first
    if (isHighRisk(inputText)) {
      const { safeMessage, helplines } = getSafetyPayload();
      return res.json({
        prediction: safeMessage,
        safetyEscalation: true,
        helplines,
      });
    }

    // 2) Mental pattern fingerprint: update profile by username, get deviation + summary (before prediction)
    let fingerprint = { patternDeviation: false, patternMessage: null, profileSummary: '' };
    try {
      fingerprint = await updateFingerprint(userId, inputText);
    } catch (fpErr) {
      console.warn('Fingerprint update failed:', fpErr.message);
    }

    // 3) Normal prediction flow
    let prediction;
    let detectedMood = 'neutral';

    // Updated prompt to ask for JSON output with mood
    const systemPrompt =
      'You are a warm, supportive mental health companion. ' +
      'Analyze the user\'s mood from their text and classify it as exactly one of: ' +
      '["very_sad", "anxious", "stressed", "neutral", "calm", "happy", "hopeful"]. ' +
      'Format your response as valid JSON with two fields: "prediction" (your reply, 2-3 short supportive sentences) and "mood" (the classification). ' +
      'Do not give medical advice. ' +
      (fingerprint.profileSummary ? ` Context: ${fingerprint.profileSummary}` : '');

    if (modelName === 'bert') {
      const fastApiResponse = await axios.post('http://127.0.0.1:8000/predict', {
        inputText,
      });
      prediction = fastApiResponse.data.prediction;
      // BERT model doesn't return mood in this format, default to neutral or simple heuristic if needed
    } else {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: inputText },
        ],
        model: modelName,
        temperature: 0.5,
        max_tokens: 300,
        top_p: 1,
        stream: false,
        stop: null,
        response_format: { type: "json_object" } // Force JSON mode
      });

      const contentStr = chatCompletion.choices[0].message.content;
      try {
        const parsed = JSON.parse(contentStr);
        prediction = parsed.prediction;
        detectedMood = parsed.mood || 'neutral';
      } catch (e) {
        console.error("Failed to parse LLM JSON:", contentStr);
        // Fallback if model fails to output JSON
        prediction = contentStr;
        detectedMood = 'neutral';
      }
    }

    // Save to history
    const timestamp = new Date().toISOString();
    await saveChat(req.user.username, { role: 'user', content: inputText, timestamp });
    await saveChat(req.user.username, { role: 'assistant', content: prediction, mood: detectedMood, timestamp });

    res.json({
      prediction,
      mood: detectedMood,
      safetyEscalation: false,
      patternDeviation: fingerprint.patternDeviation,
      patternMessage: fingerprint.patternMessage || undefined,
    });
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({
      message: 'Prediction failed',
      error: error.message,
    });
  }
});

// Get chat history
app.get('/history', requireAuth, async (req, res) => {
  try {
    const history = await getChatHistory(req.user.username);
    res.json({ history });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ message: 'Failed to retrieve history.' });
  }
});

// Crisis resources: protected so only authenticated users get access
app.get('/resources', requireAuth, (req, res) => {
  const { helplines } = getSafetyPayload();
  res.json({ helplines });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

