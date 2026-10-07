import React from 'react';
import './index.css';

const ConversationHistory = ({ 
  conversations, 
  activeConversationId, 
  onSelectConversation, 
  onNewConversation,
  isMobileDrawerOpen,
  onCloseMobileDrawer
}) => {
  // Group conversations by time
  const grouped = {
    today: [],
    yesterday: [],
    earlier: []
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  conversations.forEach(conv => {
    const d = new Date(conv.updatedAt || conv.createdAt);
    if (d >= startOfToday) {
      grouped.today.push(conv);
    } else if (d >= startOfYesterday) {
      grouped.yesterday.push(conv);
    } else {
      grouped.earlier.push(conv);
    }
  });

  const hasConversations = conversations.length > 0;

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileDrawerOpen && (
        <div className="history-drawer-overlay" onClick={onCloseMobileDrawer}></div>
      )}

      {/* History Panel */}
      <div className={`conversation-history-panel ${isMobileDrawerOpen ? 'drawer-open' : ''}`}>
        <div className="history-header">
          <h2>Conversation History</h2>
          {isMobileDrawerOpen && (
            <button className="btn-icon history-close-btn" onClick={onCloseMobileDrawer} aria-label="Close history">
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>
        <div className="history-list">
          {!hasConversations ? (
            <div className="history-empty">
              <p>No conversations yet</p>
              <span>Start a new conversation to ask questions about this repository.</span>
            </div>
          ) : (
            <>
              {grouped.today.length > 0 && (
                <div className="history-group">
                  <h3>Today</h3>
                  {grouped.today.map(c => (
                    <button 
                      key={c.id} 
                      className={`history-item ${activeConversationId === c.id ? 'active' : ''}`}
                      onClick={() => onSelectConversation(c.id)}
                    >
                      <span className="history-title" title={c.title || 'New Conversation'}>{c.title || 'New Conversation'}</span>
                    </button>
                  ))}
                </div>
              )}
              {grouped.yesterday.length > 0 && (
                <div className="history-group">
                  <h3>Yesterday</h3>
                  {grouped.yesterday.map(c => (
                    <button 
                      key={c.id} 
                      className={`history-item ${activeConversationId === c.id ? 'active' : ''}`}
                      onClick={() => onSelectConversation(c.id)}
                    >
                      <span className="history-title" title={c.title || 'New Conversation'}>{c.title || 'New Conversation'}</span>
                    </button>
                  ))}
                </div>
              )}
              {grouped.earlier.length > 0 && (
                <div className="history-group">
                  <h3>Earlier</h3>
                  {grouped.earlier.map(c => (
                    <button 
                      key={c.id} 
                      className={`history-item ${activeConversationId === c.id ? 'active' : ''}`}
                      onClick={() => onSelectConversation(c.id)}
                    >
                      <span className="history-title" title={c.title || 'New Conversation'}>{c.title || 'New Conversation'}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ConversationHistory;
