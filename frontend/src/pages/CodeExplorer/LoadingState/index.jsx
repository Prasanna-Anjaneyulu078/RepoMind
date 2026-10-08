import React from 'react';
import './index.css';

const LoadingState = () => {
  return (
    <div className="ide-main-panes loading-state-panes" aria-live="polite" aria-busy="true">
      {/* File Tree Skeleton */}
      <div className="ide-tree-pane pane-mobile-active loading-tree-pane">
        <div className="tree-scrollable-area">
          <div className="skeleton-tree-item" style={{ width: '40%' }}></div>
          <div className="skeleton-tree-item" style={{ width: '70%', marginLeft: '12px' }}></div>
          <div className="skeleton-tree-item" style={{ width: '60%', marginLeft: '12px' }}></div>
          <div className="skeleton-tree-item" style={{ width: '50%', marginLeft: '24px' }}></div>
          <div className="skeleton-tree-item" style={{ width: '65%', marginLeft: '12px' }}></div>
          <div className="skeleton-tree-item" style={{ width: '80%', marginLeft: '24px' }}></div>
          <div className="skeleton-tree-item" style={{ width: '45%' }}></div>
          <div className="skeleton-tree-item" style={{ width: '55%', marginLeft: '12px' }}></div>
        </div>
      </div>

      {/* Editor Skeleton */}
      <div className="ide-editor-pane pane-mobile-active loading-editor-pane">
        <div className="editor-tabstrip skeleton-tabstrip">
          <div className="skeleton-tab" style={{ width: '120px' }}></div>
          <div className="skeleton-tab-meta" style={{ width: '60px' }}></div>
        </div>
        
        <div className="editor-canvas-container skeleton-canvas">
          <div className="skeleton-loading-message">
            <span className="loading-title">Loading codebase...</span>
            <span className="loading-subtitle">Preparing the repository explorer</span>
          </div>
          
          <div className="skeleton-code-lines">
            <div className="skeleton-code-line" style={{ width: '30%' }}></div>
            <div className="skeleton-code-line" style={{ width: '45%' }}></div>
            <div className="skeleton-code-line" style={{ width: '20%', marginLeft: '24px' }}></div>
            <div className="skeleton-code-line" style={{ width: '60%', marginLeft: '24px' }}></div>
            <div className="skeleton-code-line" style={{ width: '50%', marginLeft: '48px' }}></div>
            <div className="skeleton-code-line" style={{ width: '40%', marginLeft: '48px' }}></div>
            <div className="skeleton-code-line" style={{ width: '25%', marginLeft: '24px' }}></div>
            <div className="skeleton-code-line" style={{ width: '35%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingState;
