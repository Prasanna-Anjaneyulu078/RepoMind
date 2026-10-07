import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import RepoMindLogo from '../../assets/RepoMind_Title_Logo.png';
import ConversationHistory from './components/ConversationHistory';
import { fetchApi } from '../../utils/apiClient.js';
import { useError } from '../../context/ErrorContext.jsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import '../CodeExplorer/MarkdownViewer/index.css';
import './index.css';

const AskRepo = ({ activeRepo }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const navComponentContext = location.state?.componentContext || null;
  const { showError } = useError();
  const [conversations, setConversations] = useState([]);
  const [recommendedQuestions, setRecommendedQuestions] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  useEffect(() => {
    if (navComponentContext && !activeConversationId) {
      setQuestion(`Explain how ${navComponentContext.name} fits into the system architecture.`);
    }
  }, [navComponentContext, activeConversationId]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (activeRepo && activeRepo.id) {
      loadInitialData();
    }
  }, [activeRepo]);

  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadInitialData = async () => {
    if (!activeRepo || !activeRepo.id) return;
    try {
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const [convData, recData] = await Promise.all([
        fetchApi(`${backendUrl}/api/repositories/${activeRepo.id}/conversations`, { credentials: 'include' }),
        fetchApi(`${backendUrl}/api/repositories/${activeRepo.id}/recommended-questions`, { credentials: 'include' })
      ]);

      if (convData.success) setConversations(convData.data);
      if (recData.success) setRecommendedQuestions(recData.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const data = await fetchApi(`${backendUrl}/api/conversations/${conversationId}`, {
        credentials: 'include'
      });
      if (data.success && data.data) {
        setMessages(data.data.messages);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAskQuestion = async (qText) => {
    if (!qText.trim()) return;
    
    const currentQuestion = qText.trim();
    setQuestion('');
    
    // Optimistic UI for User Message
    const tempUserMsg = { id: Date.now(), role: 'USER', content: currentQuestion, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, tempUserMsg]);
    setIsLoading(true);
    setError(null);

    try {
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      let convId = activeConversationId;
      const activeConversation = conversations.find(c => c.id === activeConversationId);
      const currentComponentContext = activeConversationId ? activeConversation?.componentContext : navComponentContext;

      if (!convId) {
        if (!activeRepo || !activeRepo.id) throw new Error("No active repository to start conversation in.");
        // Create conversation first
        const data = await fetchApi(`${backendUrl}/api/repositories/${activeRepo.id}/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ componentContext: currentComponentContext })
        }, true); // skip generic popup
        
        if (data.success) {
          convId = data.conversation.id;
          setActiveConversationId(convId);
          setConversations(prev => [data.conversation, ...prev]);
        }
      }

      // Post message
      const data = await fetchApi(`${backendUrl}/api/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ question: currentQuestion, topK: 8 })
      }, true); // skip popup

      if (data.success) {
        // Remove temp and add actual
        setMessages(prev => [...prev.filter(m => m.id !== tempUserMsg.id), 
          {...tempUserMsg, id: 'real_user_' + Date.now()}, 
          data.message
        ]);

        if (data.conversation && data.conversation.title) {
          setConversations(prev => prev.map(c => 
            c.id === convId ? { ...c, title: data.conversation.title } : c
          ));
        }

        // Refresh recent questions implicitly
        loadInitialData();
      }
    } catch (err) {
      const errorMessage = err.message || 'Unable to analyze the repository right now. Please try again.';
      showError({
        ...err,
        title: 'Unable to Send Message',
        message: errorMessage
      });
      setError(errorMessage);
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id)); // rollback
      setQuestion(currentQuestion); // restore composer
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAskQuestion(question);
    }
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setQuestion('');
    inputRef.current?.focus();
    setIsMobileDrawerOpen(false);
  };

  const handleSelectConversation = (id) => {
    setActiveConversationId(id);
    setIsMobileDrawerOpen(false);
  };

  if (!activeRepo) {
    return (
      <div className="ask-repo-page empty-page-state">
        <div className="empty-state-card">
          <h3 className="empty-state-title">No repository selected.</h3>
          <p className="empty-state-subtitle">Select a repository to ask questions about.</p>
          <button type="button" className="btn-action-primary" onClick={() => navigate('/repositories')} style={{ marginTop: '16px' }}>
            Go to Repositories
          </button>
        </div>
      </div>
    );
  }

  const isChatEmpty = !activeConversationId && messages.length === 0;

  return (
    <div className="ask-repo-page">
      <header className="ask-repo-header">
        <div className="ask-repo-title-group">
          <button className="mobile-history-toggle btn-icon" onClick={() => setIsMobileDrawerOpen(true)} aria-label="Open history">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div>
            <h1 className="ask-repo-title">Ask Repo</h1>
            <p className="ask-repo-subtitle">Ask questions about {activeRepo.name}</p>
          </div>
        </div>
        <button className="btn-action-light new-conversation-btn" onClick={handleNewConversation}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
          <span className="btn-text">New Conversation</span>
        </button>
      </header>

      <main className="ask-repo-main">
        <ConversationHistory 
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          isMobileDrawerOpen={isMobileDrawerOpen}
          onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
        />
        
        <div className="chat-container">
          
          {(() => {
            const activeConversation = conversations.find(c => c.id === activeConversationId);
            const currentContext = activeConversationId ? activeConversation?.componentContext : navComponentContext;
            
            if (!currentContext) return null;

            return (
              <div className="component-context-card" style={{
                margin: '16px', padding: '16px', backgroundColor: 'var(--surface-container-low)',
                borderRadius: '8px', borderLeft: '4px solid var(--primary)', display: 'flex', flexDirection: 'column', gap: '8px',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--on-surface)' }}>{currentContext.name}</h4>
                    <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>{currentContext.role}</span>
                  </div>
                  <button 
                    onClick={() => navigate(`/code-explorer?file=${encodeURIComponent(currentContext.filePath)}`)}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>code</span>
                    Open in Code Explorer
                  </button>
                </div>
                <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--primary)', background: 'var(--surface-container)', padding: '4px 8px', borderRadius: '4px', alignSelf: 'flex-start' }}>
                  {currentContext.filePath}
                </div>
                {currentContext.description && (
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--on-surface-variant)', lineHeight: '1.4' }}>
                    {currentContext.description}
                  </p>
                )}
              </div>
            );
          })()}

          <div className="chat-messages-container">
            {isChatEmpty ? (
              <div className="welcome-state">
                <div className="welcome-header">
                  <div className="welcome-icon" style={{ backgroundColor: 'transparent' }}>
                    <img src={RepoMindLogo} alt="RepoMind Logo" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                  </div>
                  <h2>RepoMind</h2>
                  <h3>Understand {activeRepo.name} with AI</h3>
                  <p>Ask anything about this repository.</p>
                </div>
                
                {recommendedQuestions.length > 0 && (
                  <div className="recommended-questions-section">
                    <h4>Recommended questions</h4>
                    <div className="recommended-grid">
                      {recommendedQuestions.map(rq => (
                        <button 
                          key={rq.id} 
                          className="recommended-card" 
                          onClick={() => handleAskQuestion(rq.question)}
                        >
                          {rq.question}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="messages-list">
                {messages.map(msg => (
                  <div key={msg.id} className={`message-row ${msg.role === 'USER' ? 'user' : 'assistant'}`}>
                    <div className="message-bubble">
                      {msg.role === 'ASSISTANT' ? (
                        <div className="markdown-content ask-repo-markdown">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="message-content">{msg.content}</div>
                      )}
                      
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="message-sources">
                          <div className="sources-title">Sources</div>
                          <div className="sources-list">
                            {msg.sources.map((src, idx) => (
                              <button 
                                key={idx} 
                                className="source-link"
                                onClick={() => navigate(`/code-explorer?file=${encodeURIComponent(src.file)}&line=${src.startLine}`)}
                              >
                                <span className="source-file">{src.file}</span>
                                <span className="source-lines">Lines {src.startLine}-{src.endLine} &rarr;</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="message-row assistant">
                    <div className="message-bubble loading-bubble">
                      <span className="material-symbols-outlined loading-spinner">progress_activity</span>
                      Analyzing repository...
                    </div>
                  </div>
                )}
                
                {error && (
                  <div className="error-banner">
                    {error}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="chat-input-wrapper">
            <div className="chat-input-container">
              <textarea
                ref={inputRef}
                className="chat-textarea"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask anything about ${activeRepo.name}...`}
                disabled={isLoading}
                rows={1}
              />
              <button 
                className="chat-submit-btn"
                onClick={() => handleAskQuestion(question)}
                disabled={!question.trim() || isLoading}
                aria-label="Send message"
              >
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
            <div className="chat-input-hint">
              Press Enter to send, Shift + Enter for new line
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
};

export default AskRepo;
