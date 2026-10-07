import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './index.css';

const MarkdownViewer = ({ content }) => {
  return (
    <div className="markdown-viewer-container">
      <div className="markdown-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default MarkdownViewer;
