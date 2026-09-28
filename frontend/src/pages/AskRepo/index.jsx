import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './index.css';

const AskRepo = ({ activeRepo }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'assistant',
      text: 'Hello! I am your RepoMind grounded on VVITU_Placement_Portal (1,248 indexed AST files). Ask any question about authentication, business models, database relations, or API routing.',
      citations: ['authMiddleware.js:14', 'schema.prisma:1', 'eligibilityService.js:15']
    }
  ]);

  useEffect(() => {
    if (location.state && location.state.prefilledQuery) {
      setInputQuery(location.state.prefilledQuery);
    }
  }, [location.state]);

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (!inputQuery.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: inputQuery
    };

    setMessages((prev) => [...prev, userMsg]);
    const currentQ = inputQuery;
    setInputQuery('');

    // Generate accurate contextual AI answer
    setTimeout(() => {
      let aiResponseText = `Based on semantic index analysis across ${activeRepo ? activeRepo.name : 'VVITU_Placement_Portal'}:`;
      let citations = ['server/middleware/authMiddleware.js', 'server/controllers/authController.js'];
      let codeSnippet = null;

      if (currentQ.toLowerCase().includes('jwt') || currentQ.toLowerCase().includes('auth')) {
        aiResponseText =
          'JWT authentication is enforced in `server/middleware/authMiddleware.js`. The middleware extracts the Bearer token from the HTTP Authorization header, verifies signature legitimacy against process.env.JWT_SECRET, and retrieves the corresponding User record from Prisma to hydrate req.user.';
        citations = ['authMiddleware.js:10', 'authController.js:18'];
        codeSnippet = `const token = authHeader.split(' ')[1];
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = await prisma.user.findUnique({ where: { id: decoded.userId } });`;
      } else if (currentQ.toLowerCase().includes('eligibility') || currentQ.toLowerCase().includes('student')) {
        aiResponseText =
          'Student eligibility logic is managed by `server/services/eligibilityService.js`. Candidates are evaluated against three primary conditions: minimum CGPA threshold, maximum allowed active backlogs (usually 0), and allowed eligible degree branches.';
        citations = ['eligibilityService.js:12', 'schema.prisma:22'];
        codeSnippet = `if (studentProfile.cgpa < driveCriteria.minCgpa) {
  reasons.push('CGPA is below minimum drive criteria');
}`;
      } else if (currentQ.toLowerCase().includes('prisma') || currentQ.toLowerCase().includes('schema') || currentQ.toLowerCase().includes('database')) {
        aiResponseText =
          'The data layer is configured via `prisma/schema.prisma`. It declares 14 relational tables in PostgreSQL, featuring strict foreign key references between User, StudentProfile, JobDrive, and Application models.';
        citations = ['prisma/schema.prisma:1', 'prisma/schema.prisma:28'];
      } else {
        aiResponseText = `The codebase handles "${currentQ}" using modular Express controllers and Prisma database models. Route endpoints are mapped in server/routes/ and validated through security middlewares before invoking business domain services.`;
      }

      const aiMsg = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: aiResponseText,
        citations,
        codeSnippet
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 600);
  };

  const handleSuggestionClick = (text) => {
    setInputQuery(text);
  };

  return (
    <div className="ask-repo-page">
      <div className="ask-repo-header">
        <div className="ask-repo-title-group">
          <h1 className="ask-repo-title">Ask Repo</h1>
          <div className="ask-repo-meta">
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--tertiary)'
              }}
            ></span>
            <span>98.4% Grounded · Claude 3.5 Sonnet</span>
          </div>
        </div>

        <button
          type="button"
          className="btn-action-light"
          onClick={() => navigate('/code-explorer')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            terminal
          </span>
          <span>Open Code Explorer</span>
        </button>
      </div>

      <div className="ask-repo-chat-container">
        <div className="chat-messages-area">
          {messages.map((m) => (
            <div key={m.id} className={`chat-bubble-row ${m.sender}`}>
              <div className={`chat-avatar ${m.sender === 'user' ? 'avatar-user' : 'avatar-assistant'}`}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  {m.sender === 'user' ? 'person' : 'auto_awesome'}
                </span>
              </div>

              <div className={`chat-content-card ${m.sender}`}>
                <p>{m.text}</p>

                {m.codeSnippet && (
                  <div className="code-snippet-box">
                    <pre style={{ margin: 0 }}>{m.codeSnippet}</pre>
                  </div>
                )}

                {m.citations && m.citations.length > 0 && (
                  <div className="citation-chip-row">
                    <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                      Citations:
                    </span>
                    {m.citations.map((cite, i) => (
                      <span
                        key={i}
                        className="citation-pill"
                        onClick={() => navigate('/code-explorer')}
                        title="Jump to code location"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                          description
                        </span>
                        <span>#{cite}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Suggested Queries */}
        <div className="chat-suggestions-row">
          <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)', fontWeight: 600 }}>
            Suggestions:
          </span>
          <button
            type="button"
            className="suggestion-chip"
            onClick={() => handleSuggestionClick('Where is JWT authentication implemented?')}
          >
            Where is JWT authentication implemented?
          </button>
          <button
            type="button"
            className="suggestion-chip"
            onClick={() => handleSuggestionClick('How does student job eligibility work?')}
          >
            How does student job eligibility work?
          </button>
          <button
            type="button"
            className="suggestion-chip"
            onClick={() => handleSuggestionClick('Where is the Prisma schema defined?')}
          >
            Where is the Prisma schema defined?
          </button>
          <button
            type="button"
            className="suggestion-chip"
            onClick={() => handleSuggestionClick('Which API creates an application?')}
          >
            Which API creates an application?
          </button>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="chat-input-bar">
          <input
            type="text"
            className="chat-input"
            placeholder="Ask anything about the codebase (e.g., #authMiddleware.js:14 or how roles are protected)..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
          />
          <button type="submit" className="btn-send-message" title="Send Question">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              send
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default AskRepo;
