import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchApi } from '../../utils/apiClient.js';
import { useError } from '../../context/ErrorContext.jsx';
import MarkdownViewer from './MarkdownViewer/index.jsx';
import LoadingState from './LoadingState/index.jsx';
import './index.css';

const TreeNode = ({ node, level, onSelect, selectedPath, expandedFolders, toggleFolder }) => {
  const isDir = node.type === 'directory';
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = selectedPath === node.path;

  const handleToggle = (e) => {
    e.stopPropagation();
    if (isDir) toggleFolder(node.path);
    else onSelect(node);
  };

  return (
    <div>
      <div 
        className={`tree-node-row ${isSelected ? 'active' : ''}`}
        style={{ paddingLeft: `${(level * 12) + 8}px` }}
        onClick={handleToggle}
      >
        <div className="tree-node-label-group">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            {isDir ? (isExpanded ? 'folder_open' : 'folder') : 'description'}
          </span>
          <span>{node.name}</span>
        </div>
        {!isDir && isSelected && <div className="active-dot-indicator" />}
      </div>
      {isDir && isExpanded && node.children && (
        <div>
          {node.children.map((child, idx) => (
            <TreeNode
              key={idx}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              selectedPath={selectedPath}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CodeExplorer = ({ activeRepo }) => {
  const navigate = useNavigate();
  const { showError } = useError();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tree, setTree] = useState([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  
  const [selectedFile, setSelectedFile] = useState(null); // Keep for tree sync if needed, but mainly we use activeFilePath
  
  // Multi-tab state
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFilePath, setActiveFilePath] = useState(null);
  
  const [repoStatus, setRepoStatus] = useState(null);
  
  const [error, setError] = useState(null);

  const initialFilePath = searchParams.get('file');
  const initialLine = searchParams.get('line');

  useEffect(() => {
    if (activeRepo && activeRepo.id) {
      loadTree();
    }
  }, [activeRepo]);

  // Polling for repository indexing status
  useEffect(() => {
    let intervalId;
    if (activeRepo && activeRepo.id && (repoStatus === 'QUEUED' || repoStatus === 'INGESTING')) {
      intervalId = setInterval(() => {
        loadTree();
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeRepo, repoStatus]);

  const latestOpenFiles = useRef(openFiles);
  const latestActiveFilePath = useRef(activeFilePath);

  useEffect(() => {
    latestOpenFiles.current = openFiles;
    latestActiveFilePath.current = activeFilePath;
  }, [openFiles, activeFilePath]);

  useEffect(() => {
    if (initialFilePath && tree.length > 0) {
      if (!latestOpenFiles.current.find(f => f.path === initialFilePath)) {
        handleSelectFileByPath(initialFilePath);
      } else if (latestActiveFilePath.current !== initialFilePath) {
        setActiveFilePath(initialFilePath);
      }
    }
  }, [initialFilePath, tree]);

  const loadTree = async () => {
    if (!activeRepo || !activeRepo.id) return;
    setLoadingTree(true);
    setError(null);
    try {
      const data = await fetchApi(`/api/repositories/${activeRepo.id}/files/tree`, {
        credentials: 'include'
      }, true); // Handle errors manually to customize popup

      if (data.success && data.data) {
        setTree(data.data.tree || []);
        setRepoStatus(data.data.repository?.ingestionStatus || null);
      }
    } catch (err) {
      if (repoStatus === 'QUEUED' || repoStatus === 'INGESTING') {
         // Silently fail polling
      } else {
        showError({
          ...err,
          title: 'Unable to Load Repository',
          message: 'The repository files could not be loaded. Please try again.'
        }, loadTree);
        setError('Unable to load repository tree.');
      }
    } finally {
      setLoadingTree(false);
    }
  };

  const loadFileContent = async (path) => {
    if (!activeRepo || !activeRepo.id) return;
    try {
      const data = await fetchApi(`/api/repositories/${activeRepo.id}/files/content?path=${encodeURIComponent(path)}`, {
        credentials: 'include'
      }, true); // Custom popup

      if (data.success && data.data) {
        setOpenFiles(prev => prev.map(f => 
          f.path === path ? { ...f, content: data.data.file.content, loading: false } : f
        ));
      }
    } catch (err) {
      showError({
        ...err,
        title: 'Unable to Load File',
        message: 'The selected file could not be loaded. Please try again.'
      });
      setOpenFiles(prev => prev.map(f => 
        f.path === path ? { ...f, error: 'Unable to load file content.', loading: false } : f
      ));
    }
  };

  const openFile = (path, name, size, language) => {
    const existing = openFiles.find(f => f.path === path);
    if (existing) {
      setActiveFilePath(path);
      if (searchParams.get('file') !== path) {
        setSearchParams({ file: path });
      }
      return;
    }
    
    const newFile = {
      path,
      name,
      size,
      language,
      content: null,
      loading: true,
      error: null
    };
    
    setOpenFiles(prev => [...prev, newFile]);
    setActiveFilePath(path);
    if (searchParams.get('file') !== path) {
      setSearchParams({ file: path });
    }
    
    loadFileContent(path);
  };

  const handleCloseTab = (e, path) => {
    e.stopPropagation();
    
    const closedIndex = openFiles.findIndex(f => f.path === path);
    if (closedIndex === -1) return;

    const nextFiles = openFiles.filter(f => f.path !== path);
    setOpenFiles(nextFiles);
    
    if (activeFilePath === path) {
      let newActivePath = null;
      if (nextFiles.length > 0) {
        const nextIndex = closedIndex > 0 ? closedIndex - 1 : 0;
        newActivePath = nextFiles[nextIndex].path;
      }
      setActiveFilePath(newActivePath);
      setSearchParams(newActivePath ? { file: newActivePath } : {});
    }
  };

  const toggleFolder = (path) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleSelectFile = (node) => {
    setSelectedFile(node);
    openFile(node.path, node.name, node.size, node.language);
  };

  const handleSelectFileByPath = (path) => {
    const expandParents = (parts) => {
      let currentPath = '';
      const toExpand = [];
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
        toExpand.push(currentPath);
      }
      setExpandedFolders(prev => {
        const next = new Set(prev);
        toExpand.forEach(p => next.add(p));
        return next;
      });
    };
    
    expandParents(path.split('/'));
    setSelectedFile({ path, name: path.split('/').pop() });
    
    // Attempt to find node info from tree if possible, otherwise use generic
    let size = 0, language = 'Unknown';
    // Simplified: we will just open it, the backend will return proper meta anyway
    openFile(path, path.split('/').pop(), size, language);
  };

  if (!activeRepo) {
    return (
      <div className="code-explorer-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="empty-state-card" style={{ maxWidth: '400px', textAlign: 'center' }}>
          <h3 className="empty-state-title">No repository selected.</h3>
          <p className="empty-state-subtitle">Select a repository to explore its files.</p>
          <button type="button" className="btn-action-primary" onClick={() => navigate('/repositories')} style={{ marginTop: '16px' }}>
            Go to Repositories
          </button>
        </div>
      </div>
    );
  }

  const renderFileContent = () => {
    if (!['COMPLETED', 'INDEXING_COMPLETED', 'EMBEDDING', 'EMBEDDING_FAILED'].includes(repoStatus)) {
      return (
        <div style={{ padding: '48px', color: 'var(--on-surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', maxWidth: '600px', margin: '0 auto' }}>
          
          <div className="empty-state-card" style={{ width: '100%', border: '1px solid var(--outline-variant)', borderRadius: '12px', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'var(--surface)' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '8px', color: 'var(--on-surface)' }}>
              {repoStatus === 'QUEUED' && 'Repository queued'}
              {repoStatus === 'INGESTING' && 'Analyzing repository'}
              {repoStatus === 'FAILED' && 'Repository indexing failed'}
              {repoStatus === 'NOT_INGESTED' && 'Repository not indexed'}
            </h3>
            
            <p style={{ color: 'var(--on-surface-variant)', textAlign: 'center', marginBottom: '24px', lineHeight: '1.5' }}>
              {repoStatus === 'QUEUED' && 'Preparing the repository for analysis...'}
              {repoStatus === 'INGESTING' && 'RepoMind is analyzing the codebase and building its knowledge base. This may take a few minutes for larger repositories.'}
              {repoStatus === 'FAILED' && 'RepoMind could not finish analyzing this repository. Please check your backend connection or rate limits.'}
              {repoStatus === 'NOT_INGESTED' && 'This repository has not been indexed yet. Please click the "Sync" button in the top header to start indexing.'}
            </p>

            {(repoStatus === 'QUEUED' || repoStatus === 'INGESTING') && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '20px' }}>check_circle</span>
                  <span style={{ color: 'var(--on-surface)' }}>Repository connected</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className={`material-symbols-outlined ${repoStatus === 'INGESTING' ? 'spinning' : ''}`} style={{ color: repoStatus === 'INGESTING' ? 'var(--primary)' : 'var(--on-surface-variant)', fontSize: '20px' }}>
                    {repoStatus === 'INGESTING' ? 'sync' : 'radio_button_unchecked'}
                  </span>
                  <span style={{ color: repoStatus === 'INGESTING' ? 'var(--on-surface)' : 'var(--on-surface-variant)' }}>Reading repository files</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--on-surface-variant)', fontSize: '20px' }}>radio_button_unchecked</span>
                  <span style={{ color: 'var(--on-surface-variant)' }}>Building code index</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--on-surface-variant)', fontSize: '20px' }}>radio_button_unchecked</span>
                  <span style={{ color: 'var(--on-surface-variant)' }}>Preparing AI knowledge</span>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    const activeFile = openFiles.find(f => f.path === activeFilePath);
    if (!activeFile) {
      return (
        <div style={{ padding: '24px', color: 'var(--on-surface-variant)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--outline)', marginBottom: '16px' }}>
            code
          </span>
          <h3>Select a file</h3>
          <p>Choose a file from the repository tree to view its content.</p>
        </div>
      );
    }

    if (activeFile.loading) {
      return (
        <div style={{ padding: '24px', color: 'var(--on-surface-variant)' }}>
          Loading file content...
        </div>
      );
    }
    
    if (activeFile.error) {
      return <div style={{ color: 'var(--error)', padding: '16px' }}>{activeFile.error}</div>;
    }

    let displayContent = activeFile.content || '';

    // Markdown detection
    const isMarkdown = activeFile.language?.toLowerCase() === 'markdown' || 
                       activeFile.path.match(/\.(md|markdown)$/i);
                       
    if (isMarkdown) {
      return <MarkdownViewer content={displayContent} />;
    }

    if (activeFile.language === 'JSON' || activeFile.path.endsWith('.json')) {
      try {
        const parsed = JSON.parse(displayContent);
        displayContent = JSON.stringify(parsed, null, 2);
      } catch (e) {
        // keep original content if it fails to parse
      }
    }

    const lines = displayContent.split('\n');
    const targetLine = initialLine ? parseInt(initialLine, 10) : null;
    
    // Very lightweight syntax highlighter utilizing existing CSS classes
    const highlightLine = (line, language) => {
      if (!line.trim()) return line || ' ';
      
      // Don't highlight very long lines for performance
      if (line.length > 500) return line;

      let html = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      const isJS = ['JavaScript', 'TypeScript', 'JavaScript React', 'TypeScript React'].includes(language);
      const isJSON = language === 'JSON' || activeFile.path.endsWith('.json');
      
      if (isJS || isJSON) {
        // Strings
        html = html.replace(/(&quot;.*?&quot;|'.*?'|`.*?`)/g, '<span class="syntax-string">$1</span>');
        // Comments
        html = html.replace(/(\/\/.*)$/g, '<span class="syntax-comment">$1</span>');
        // Numbers
        html = html.replace(/\b(\d+)\b/g, '<span class="syntax-number">$1</span>');
        
        if (isJS) {
          // Keywords
          const keywords = ['const', 'let', 'var', 'function', 'return', 'import', 'export', 'if', 'else', 'for', 'while', 'async', 'await', 'class', 'extends', 'true', 'false', 'null', 'undefined', 'new'];
          const kwRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
          html = html.replace(kwRegex, '<span class="syntax-keyword">$1</span>');
          // Functions
          html = html.replace(/\b([a-zA-Z_$][0-9a-zA-Z_$]*)\s*(?=\()/g, '<span class="syntax-func">$1</span>');
        } else if (isJSON) {
          // JSON Keys (strings before colon)
          html = html.replace(/<span class="syntax-string">(&quot;.*?&quot;)<\/span>(\s*:)/g, '<span class="syntax-keyword">$1</span>$2');
          // Booleans/null
          html = html.replace(/\b(true|false|null)\b/g, '<span class="syntax-keyword">$1</span>');
        }
      } else if (language === 'HTML' || language === 'XML') {
        html = html.replace(/(&lt;\/?)([a-zA-Z0-9-]+)/g, '$1<span class="syntax-keyword">$2</span>');
        html = html.replace(/([a-zA-Z0-9-]+)(=)/g, '<span class="syntax-func">$1</span>$2');
        html = html.replace(/(&quot;.*?&quot;|'.*?')/g, '<span class="syntax-string">$1</span>');
      }

      return <span dangerouslySetInnerHTML={{ __html: html }} />;
    };
    
    return (
      <div className="editor-canvas-container">
        <div className="editor-line-numbers">
          {lines.map((_, i) => (
            <div key={i} style={{ color: targetLine === i + 1 ? 'var(--primary)' : undefined, fontWeight: targetLine === i + 1 ? 'bold' : 'normal' }}>
              {i + 1}
            </div>
          ))}
        </div>
        <div className="editor-code-body">
          {lines.map((line, i) => (
            <div key={i} style={{ backgroundColor: targetLine === i + 1 ? 'var(--primary-container)' : undefined }}>
              {highlightLine(line, activeFile.language)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="code-explorer-container">
      <div className="ide-command-bar">
        <div className="ide-bar-left">
          <div className="ide-path-breadcrumbs">
            <span className="path-crumb-clickable" onClick={() => navigate('/repositories')}>
              {activeRepo.name}
            </span>
            {activeFilePath && (
              <>
                <span>/</span>
                <span>{activeFilePath}</span>
              </>
            )}
          </div>
        </div>
        <div className="ide-bar-actions">
          <button className="btn-ide-secondary" onClick={loadTree}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>sync</span>
            Refresh
          </button>
        </div>
      </div>
      
      {(loadingTree && tree.length === 0) || (repoStatus && ['QUEUED', 'INGESTING'].includes(repoStatus)) ? (
        <LoadingState />
      ) : (
      <div className="ide-main-panes">
        {/* File Tree */}
        <div className="ide-tree-pane pane-mobile-active">
          <div className="tree-scrollable-area">
            {repoStatus && !['COMPLETED', 'INDEXING_COMPLETED', 'EMBEDDING', 'EMBEDDING_FAILED'].includes(repoStatus) ? (
              <div style={{ padding: '16px', fontSize: '13px', color: 'var(--on-surface-variant)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {repoStatus === 'NOT_INGESTED' && 'Repository files are not indexed yet.'}
                {repoStatus === 'QUEUED' && 'Repository indexing is queued.'}
                {repoStatus === 'INGESTING' && 'Indexing in progress...'}
                {repoStatus === 'FAILED' && 'Repository indexing failed.'}
              </div>
            ) : tree.length === 0 ? (
              <div style={{ padding: '16px', fontSize: '13px', color: 'var(--on-surface-variant)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>search_off</span>
                No code files were found in this repository.
              </div>
            ) : (
              tree.map((node, idx) => (
                <TreeNode
                  key={idx}
                  node={node}
                  level={0}
                  onSelect={handleSelectFile}
                  selectedPath={activeFilePath}
                  expandedFolders={expandedFolders}
                  toggleFolder={toggleFolder}
                />
              ))
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="ide-editor-pane pane-mobile-active">
          {openFiles.length > 0 && (
            <div className="editor-tabstrip">
              <div className="editor-tabstrip-left">
                <div className="editor-tabs-group">
                  {openFiles.map(file => (
                    <div 
                      key={file.path} 
                      className={`code-tab ${activeFilePath === file.path ? 'active' : ''}`}
                      onClick={() => {
                        setActiveFilePath(file.path);
                        setSearchParams({ file: file.path });
                      }}
                      title={file.path}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>description</span>
                      <span className="editor-tab-filename">{file.name}</span>
                      <span 
                        className="material-symbols-outlined tab-close-btn" 
                        onClick={(e) => handleCloseTab(e, file.path)}
                        aria-label={`Close ${file.name}`}
                      >
                        close
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {activeFilePath && (() => {
                const activeFile = openFiles.find(f => f.path === activeFilePath);
                return activeFile ? (
                  <div className="tab-meta-info-group">
                    <div className="tab-meta-info">
                      <span>{activeFile.language || 'text'}</span>
                      <span>•</span>
                      <span>{activeFile.size !== undefined ? (activeFile.size / 1024).toFixed(1) : '?'} KB</span>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}
          {error && <div style={{ color: 'var(--error)', padding: '16px' }}>{error}</div>}
          {!error && renderFileContent()}
        </div>
      </div>
      )}
    </div>
  );
};

export default CodeExplorer;
