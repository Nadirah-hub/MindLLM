import React, { useState, useEffect, useRef } from 'react';
import api, { getStoredToken, getStoredUsername, clearStoredAuth } from './api';
import AuthScreen from './AuthScreen';
import './App.css';

function App() {
  const [auth, setAuth] = useState(() => ({
    token: getStoredToken(),
    username: getStoredUsername(),
  }));
  const [inputText, setInputText] = useState('');
  const [modelName, setModelName] = useState('llama-3.1-8b-instant');
  const [messages, setMessages] = useState([]);
  const [chatStarted, setChatStarted] = useState(false);
  const [mood, setMood] = useState('neutral');
  const [moodLevel, setMoodLevel] = useState(1);
  const [safetyEscalation, setSafetyEscalation] = useState(false);
  const [helplines, setHelplines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResources, setShowResources] = useState(false);
  const [cachedHelplines, setCachedHelplines] = useState([]);
  const [patternMessage, setPatternMessage] = useState('');
  const chatEndRef = useRef(null);

  const [historyLoaded, setHistoryLoaded] = useState(false);

  useEffect(() => {
    const handleLogout = () => setAuth({ token: null, username: null });
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  // Fetch history and resources on login
  useEffect(() => {
    if (!auth.token) return;

    // Fetch resources
    api.get('/resources')
      .then((res) => {
        if (res.data && res.data.helplines) setCachedHelplines(res.data.helplines);
      })
      .catch(() => { });

    // Fetch history
    api.get('/history')
      .then((res) => {
        if (res.data && res.data.history) {
          setMessages(res.data.history); // Set initial messages from history

          // Set mood from last assistant message if available
          const lastAssistantMsg = [...res.data.history].reverse().find(m => m.role === 'assistant' && m.mood);
          if (lastAssistantMsg) {
            setMood(lastAssistantMsg.mood);
          }
          setHistoryLoaded(true);
        }
      })
      .catch((err) => console.error("Failed to load history", err));

  }, [auth.token]);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, historyLoaded]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading) {
        handlePredict();
      }
    }
  };

  const handlePredict = async () => {
    setError('');
    setSafetyEscalation(false);
    setHelplines([]);
    setPatternMessage('');

    const trimmed = inputText.trim();
    if (!trimmed) {
      setError('Please enter some text.');
      return;
    }

    // Optimistically add user message
    const tempUserMsg = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const response = await api.post('/predict', { inputText: trimmed, modelName });
      if (response.status === 200) {
        const content = response.data.prediction || '';
        const escalated = Boolean(response.data.safetyEscalation);
        const newHelplines = response.data.helplines || [];
        const patternMsg = response.data.patternMessage;
        const newMood = response.data.mood;

        if (patternMsg) setPatternMessage(patternMsg);

        // Update mood if backend returned one
        if (newMood) {
          setMood((prevMood) => {
            if (prevMood === newMood) {
              return prevMood; // Keep level or logic if needed
            } else {
              setMoodLevel(1); // Reset level on change
              return newMood;
            }
          });
        }

        // Add assistant's reply
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content,
            mood: newMood,
            safetyEscalation: escalated,
          },
        ]);

        setSafetyEscalation(escalated);
        setHelplines(newHelplines);
        setChatStarted(true);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please sign in again.');
        return;
      }
      const msg =
        err.response?.data?.message || err.message || 'Request failed. Is the server running?';
      const detail = err.response?.data?.error;
      setError(detail ? `${msg}: ${detail}` : msg);
    } finally {
      setLoading(false);
      setInputText('');
    }
  };

  const displayHelplines = helplines.length ? helplines : cachedHelplines;
  const isAuthenticated = !!auth.token;

  if (!isAuthenticated) {
    return (
      <AuthScreen
        onLogin={(username) => setAuth({ token: getStoredToken(), username: username || getStoredUsername() })}
      />
    );
  }

  return (
    <div className={`app-wrap app-mood-${mood} app-mood-level-${moodLevel}`}>
      <div className="above-app">
        <header className="app-header">
          <h1 className="large-text">Mental Health Support</h1>
          <p className="tagline">
            Hello, {auth.username}. Share how you're feeling—we'll respond with care and connect you to help when needed.
          </p>
          <button
            type="button"
            className="logout-button"
            onClick={() => {
              clearStoredAuth();
              setAuth({ token: null, username: null });
            }}
          >
            Sign out
          </button>
        </header>

        <main className="App">
          <div className="controls controls-top">
            <label htmlFor="modelSelect" className="small-text">
              Model
            </label>
            <select
              id="modelSelect"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="small-input"
            >
              <option value="llama-3.1-8b-instant">Llama 3.1 8B (fast)</option>
              <option value="llama-3.3-70b-versatile">Llama 3.3 70B</option>
              <option value="openai/gpt-oss-20b">GPT OSS 20B</option>
              <option value="bert">BERT (needs Python server)</option>
            </select>
          </div>

          {error && (
            <div className="message message-error" role="alert">
              {error}
            </div>
          )}

          {safetyEscalation && (
            <div className="safety-banner" role="alert">
              <div className="safety-banner-icon">🛟</div>
              <h3 className="safety-banner-title">We're here to help you stay safe</h3>
              <p className="safety-banner-text">
                Your message suggests you might be in distress. Please use the resources below—they're available 24/7 in many regions.
              </p>
            </div>
          )}

          {patternMessage && (
            <div className="pattern-banner" role="status" aria-live="polite">
              <span className="pattern-banner-icon">✨</span>
              <p className="pattern-banner-text">{patternMessage}</p>
            </div>
          )}

          {messages.length > 0 && (
            <section className="chat-window" aria-label="Conversation">
              <div className="chat-messages">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`chat-row chat-row-${m.role}`}
                  >
                    <div
                      className={`chat-bubble chat-bubble-${m.role}${m.safetyEscalation ? ' chat-bubble-safety' : ''
                        }`}
                    >
                      {m.content.split('\n').map((line, i) => (
                        <p key={i}>{line || <br />}</p>
                      ))}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </section>
          )}

          {(safetyEscalation && helplines.length > 0) && (
            <section className="helplines-section" aria-label="Crisis resources">
              <h3 className="helplines-title">Crisis & support lines</h3>
              <p className="helplines-intro">Reach out anytime. These services are confidential and many are 24/7.</p>
              <ul className="helplines-list">
                {helplines.map((h, i) => (
                  <li key={i} className="helpline-item">
                    <span className="helpline-region">{h.region}</span>
                    <strong className="helpline-name">{h.name}</strong>
                    <span className="helpline-number">
                      {h.tel ? (
                        <a href={`tel:${h.tel}`} className="helpline-link">{h.number}</a>
                      ) : (
                        <span>{h.number}</span>
                      )}
                    </span>
                    {h.url && (
                      <a href={h.url} target="_blank" rel="noopener noreferrer" className="helpline-link helpline-url">
                        Visit site
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="resources-toggle">
            <button
              type="button"
              className="link-button"
              onClick={() => setShowResources(!showResources)}
              aria-expanded={showResources}
            >
              {showResources ? 'Hide' : 'Show'} crisis resources
            </button>
          </div>

          {showResources && displayHelplines.length > 0 && (
            <section className="helplines-section helplines-always" aria-label="All crisis resources">
              <h3 className="helplines-title">Crisis & support lines</h3>
              <ul className="helplines-list">
                {displayHelplines.map((h, i) => (
                  <li key={i} className="helpline-item">
                    <span className="helpline-region">{h.region}</span>
                    <strong className="helpline-name">{h.name}</strong>
                    <span className="helpline-number">
                      {h.tel ? (
                        <a href={`tel:${h.tel}`} className="helpline-link">{h.number}</a>
                      ) : (
                        <span>{h.number}</span>
                      )}
                    </span>
                    {h.url && (
                      <a href={h.url} target="_blank" rel="noopener noreferrer" className="helpline-link helpline-url">
                        Visit site
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Input area anchored under the chat, like messaging apps */}
          <div className="controls controls-input">
            <label htmlFor="userInput" className="small-text">
              {chatStarted ? 'Reply here' : 'How are you feeling?'}
            </label>
            <textarea
              id="userInput"
              placeholder={chatStarted ? 'Type your reply and press Enter…' : 'Type your thoughts here...'}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="large-input"
              rows={chatStarted ? 3 : 4}
            />

            {!chatStarted && (
              <button
                type="button"
                onClick={handlePredict}
                className="large-button"
                disabled={loading}
              >
                {loading ? 'Thinking...' : 'Get response'}
              </button>
            )}
          </div>
        </main>

        <div className="below-app" />
      </div>
    </div>
  );
}

export default App;
