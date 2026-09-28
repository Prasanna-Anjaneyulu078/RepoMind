import React from 'react';
import { useNavigate } from 'react-router-dom';
import './index.css';

const QuestionModal = ({ question, isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen || !question) return null;

  const handleOpenAskRepo = () => {
    onClose();
    navigate('/ask-repo', { state: { prefilledQuery: question.question } });
  };

  const handleOpenCode = () => {
    onClose();
    navigate('/code-explorer');
  };

  return (
    <div className="question-modal-backdrop" onClick={onClose}>
      <div className="question-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="question-modal-header">
          <div className="question-modal-title-group">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '20px', color: 'var(--primary)', marginTop: '2px' }}
            >
              chat_bubble
            </span>
            <div>
              <h3 className="question-modal-title">{question.question}</h3>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'var(--font-family-mono)',
                  fontSize: '11px',
                  color: 'var(--on-surface-variant)',
                  marginTop: '4px'
                }}
              >
                <span>{question.repo}</span>
                <span>•</span>
                <span>{question.timestamp}</span>
                <span>•</span>
                <span style={{ color: 'var(--tertiary)', fontWeight: 600 }}>98.4% grounded</span>
              </div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              close
            </span>
          </button>
        </div>

        <div className="question-modal-body">
          <div className="answer-card">
            <div className="answer-header">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                verified
              </span>
              <span>Grounded AI Synthesis</span>
            </div>
            <p className="answer-text">{question.answer}</p>
          </div>

          <div className="citation-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--primary)' }}>
                description
              </span>
              <span>{question.sourceFile}</span>
              <span style={{ color: 'var(--on-surface-variant)' }}>({question.lineRef})</span>
            </div>
            <button
              type="button"
              onClick={handleOpenCode}
              style={{
                color: 'var(--primary)',
                fontWeight: 600,
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              <span>Inspect</span>
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                arrow_forward
              </span>
            </button>
          </div>

          {question.tags && (
            <div className="tags-group">
              <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Topics:</span>
              {question.tags.map((tag, i) => (
                <span key={i} className="tag-badge">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="question-modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn-header-ask"
            onClick={handleOpenAskRepo}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              forum
            </span>
            <span>Follow up in Ask Repo</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionModal;
