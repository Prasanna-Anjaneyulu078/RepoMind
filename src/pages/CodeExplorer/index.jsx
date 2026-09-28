import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fileTree, fileContents } from '../../data/codebase.js';
import './index.css';

const CodeExplorer = ({ activeRepo }) => {
  const [selectedFilePath, setSelectedFilePath] = useState('server/middleware/authMiddleware.js');
  const [openTabs, setOpenTabs] = useState([
    'server/middleware/authMiddleware.js',
    'prisma/schema.prisma'
  ]);
  const [searchFilter, setSearchFilter] = useState('');
  const [copied, setCopied] = useState(false);
  const [isRaw, setIsRaw] = useState(false);
  const [aiDrawerVisible, setAiDrawerVisible] = useState(true);
  const [mobilePane, setMobilePane] = useState('code');
  const [treeState, setTreeState] = useState({
    client: false,
    server: true,
    controllers: false,
    middleware: true,
    routes: false,
    services: false,
    prisma: true
  });
  const navigate = useNavigate();

  const currentFile = fileContents[selectedFilePath] || fileContents['server/middleware/authMiddleware.js'];

  const toggleFolder = (folderKey) => {
    setTreeState((prev) => ({
      ...prev,
      [folderKey]: !prev[folderKey]
    }));
  };

  const handleSelectFile = (path) => {
    setSelectedFilePath(path);
    setMobilePane('code');
    if (!openTabs.includes(path)) {
      setOpenTabs((prev) => [...prev, path]);
    }
  };

  const handleCloseTab = (e, path) => {
    e.stopPropagation();
    if (openTabs.length <= 1) return;
    const remaining = openTabs.filter((p) => p !== path);
    setOpenTabs(remaining);
    if (selectedFilePath === path) {
      setSelectedFilePath(remaining[0]);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentFile.code);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 1800);
  };

  const handleAskAIAboutFile = () => {
    navigate('/ask-repo', {
      state: { prefilledQuery: `Explain the security guardrails and inbound callers of #${currentFile.name}:1` }
    });
  };

  return (
    <div className="code-explorer-container">
      {/* Top Command & Breadcrumb Bar */}
      <div className="ide-command-bar">
        <div className="ide-bar-left">
          <div className="ide-branch-badge">
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--primary)' }}>
              alt_route
            </span>
            <span>{activeRepo ? activeRepo.branch : 'main'}</span>
            <span style={{ color: 'var(--outline-variant)' }}>·</span>
            <span style={{ color: 'var(--on-surface-variant)' }}>
              {activeRepo ? `${activeRepo.filesCount.toLocaleString()} indexed` : '1,248 indexed'}
            </span>
          </div>

          <div className="ide-path-breadcrumbs">
            <span className="path-crumb-clickable" onClick={() => navigate('/repositories')}>
              {activeRepo ? activeRepo.name : 'VVITU_Placement_Portal'}
            </span>
            <span>/</span>
            {selectedFilePath.split('/').map((part, index, arr) => (
              <React.Fragment key={index}>
                {index === arr.length - 1 ? (
                  <span className="path-crumb-active">{part}</span>
                ) : (
                  <>
                    <span className="path-crumb-clickable">{part}</span>
                    <span>/</span>
                  </>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="ide-bar-actions">
          <button
            type="button"
            className="btn-ide-explain"
            onClick={() => {
              setAiDrawerVisible(!aiDrawerVisible);
              if (!aiDrawerVisible) {
                setMobilePane('ai');
              }
            }}
            title="Toggle AI Mentor Drawer"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
              auto_awesome
            </span>
            <span>{aiDrawerVisible ? 'AI Active' : 'Explain File'}</span>
          </button>

          <button
            type="button"
            className="btn-ide-secondary"
            onClick={handleAskAIAboutFile}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--on-surface-variant)' }}>
              chat
            </span>
            <span>Ask About File</span>
          </button>

          <button
            type="button"
            className="btn-ide-secondary"
            onClick={handleCopyCode}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--on-surface-variant)' }}>
              content_copy
            </span>
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            type="button"
            className="btn-ide-secondary"
            onClick={() => setIsRaw(!isRaw)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
              raw_on
            </span>
            <span>{isRaw ? 'Formatted' : 'Raw'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Segmented Pane Switcher (below 768px only) */}
      <div className="ide-mobile-switcher">
        <button
          type="button"
          className={`code-tab ide-mobile-switch-btn ${mobilePane === 'files' ? 'active' : ''}`}
          onClick={() => setMobilePane('files')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
            folder_open
          </span>
          <span>Files</span>
        </button>
        <button
          type="button"
          className={`code-tab ide-mobile-switch-btn ${mobilePane === 'code' ? 'active' : ''}`}
          onClick={() => setMobilePane('code')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
            code
          </span>
          <span>Code ({currentFile.name})</span>
        </button>
        <button
          type="button"
          className={`code-tab ide-mobile-switch-btn ${mobilePane === 'ai' ? 'active' : ''}`}
          onClick={() => {
            setMobilePane('ai');
            setAiDrawerVisible(true);
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
            auto_awesome
          </span>
          <span>AI Mentor</span>
        </button>
      </div>

      {/* Main IDE Panes Container */}
      <div className="ide-main-panes">
        {/* Left Panel: File Explorer */}
        <div className={`ide-tree-pane ${mobilePane === 'files' ? 'pane-mobile-active' : ''}`}>
          <div className="tree-search-box">
            <div className="tree-search-inner">
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--on-surface-variant)' }}>
                search
              </span>
              <input
                type="text"
                className="tree-search-input"
                placeholder="Search files (⌘P)..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
              <kbd className="kbd-shortcut">⌘P</kbd>
            </div>
          </div>

          <div className="tree-scrollable-area">
            {/* Client Folder */}
            <div>
              <div
                className="tree-node-row"
                onClick={() => toggleFolder('client')}
              >
                <div className="tree-node-label-group">
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                    {treeState.client ? 'folder_open' : 'folder'}
                  </span>
                  <span>client</span>
                </div>
              </div>
              {treeState.client && (
                <div style={{ paddingLeft: '16px' }}>
                  <div className="tree-node-row">
                    <div className="tree-node-label-group">
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                        folder
                      </span>
                      <span>src</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Server Folder */}
            <div>
              <div
                className="tree-node-row"
                onClick={() => toggleFolder('server')}
              >
                <div className="tree-node-label-group">
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                    {treeState.server ? 'folder_open' : 'folder'}
                  </span>
                  <span style={{ fontWeight: 600 }}>server</span>
                </div>
              </div>

              {treeState.server && (
                <div style={{ paddingLeft: '14px' }}>
                  {/* Controllers */}
                  <div>
                    <div
                      className="tree-node-row"
                      onClick={() => toggleFolder('controllers')}
                    >
                      <div className="tree-node-label-group">
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                          {treeState.controllers ? 'folder_open' : 'folder'}
                        </span>
                        <span>controllers</span>
                      </div>
                    </div>
                    {treeState.controllers && (
                      <div style={{ paddingLeft: '14px' }}>
                        <div
                          className={`tree-node-row ${selectedFilePath === 'server/controllers/authController.js' ? 'active' : ''}`}
                          onClick={() => handleSelectFile('server/controllers/authController.js')}
                        >
                          <div className="tree-node-label-group">
                            <span className="material-symbols-outlined" style={{ fontSize: '13px', color: 'var(--secondary)' }}>
                              javascript
                            </span>
                            <span>authController.js</span>
                          </div>
                        </div>
                        <div className="tree-node-row">
                          <div className="tree-node-label-group">
                            <span className="material-symbols-outlined" style={{ fontSize: '13px', color: 'var(--secondary)' }}>
                              javascript
                            </span>
                            <span>applicationController.js</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Middleware */}
                  <div>
                    <div
                      className="tree-node-row"
                      onClick={() => toggleFolder('middleware')}
                    >
                      <div className="tree-node-label-group">
                        <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--primary)' }}>
                          {treeState.middleware ? 'folder_open' : 'folder'}
                        </span>
                        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>middleware</span>
                      </div>
                    </div>

                    {treeState.middleware && (
                      <div style={{ paddingLeft: '14px' }}>
                        <div
                          className={`tree-node-row ${selectedFilePath === 'server/middleware/authMiddleware.js' ? 'active' : ''}`}
                          onClick={() => handleSelectFile('server/middleware/authMiddleware.js')}
                        >
                          <div className="tree-node-label-group">
                            <span className="material-symbols-outlined" style={{ fontSize: '13px', color: 'var(--primary)' }}>
                              data_object
                            </span>
                            <span>authMiddleware.js</span>
                          </div>
                          {selectedFilePath === 'server/middleware/authMiddleware.js' && (
                            <span className="active-dot-indicator"></span>
                          )}
                        </div>

                        <div className="tree-node-row">
                          <div className="tree-node-label-group">
                            <span className="material-symbols-outlined" style={{ fontSize: '13px', color: 'var(--secondary)' }}>
                              javascript
                            </span>
                            <span>errorMiddleware.js</span>
                          </div>
                        </div>

                        <div className="tree-node-row">
                          <div className="tree-node-label-group">
                            <span className="material-symbols-outlined" style={{ fontSize: '13px', color: 'var(--secondary)' }}>
                              javascript
                            </span>
                            <span>rateLimiter.js</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Routes */}
                  <div>
                    <div
                      className="tree-node-row"
                      onClick={() => toggleFolder('routes')}
                    >
                      <div className="tree-node-label-group">
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                          {treeState.routes ? 'folder_open' : 'folder'}
                        </span>
                        <span>routes</span>
                      </div>
                    </div>
                  </div>

                  {/* Services */}
                  <div>
                    <div
                      className="tree-node-row"
                      onClick={() => toggleFolder('services')}
                    >
                      <div className="tree-node-label-group">
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                          {treeState.services ? 'folder_open' : 'folder'}
                        </span>
                        <span>services</span>
                      </div>
                    </div>
                    {treeState.services && (
                      <div style={{ paddingLeft: '14px' }}>
                        <div
                          className={`tree-node-row ${selectedFilePath === 'server/services/eligibilityService.js' ? 'active' : ''}`}
                          onClick={() => handleSelectFile('server/services/eligibilityService.js')}
                        >
                          <div className="tree-node-label-group">
                            <span className="material-symbols-outlined" style={{ fontSize: '13px', color: 'var(--secondary)' }}>
                              javascript
                            </span>
                            <span>eligibilityService.js</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Prisma Folder */}
            <div>
              <div
                className="tree-node-row"
                onClick={() => toggleFolder('prisma')}
              >
                <div className="tree-node-label-group">
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                    {treeState.prisma ? 'folder_open' : 'folder'}
                  </span>
                  <span>prisma</span>
                </div>
              </div>
              {treeState.prisma && (
                <div style={{ paddingLeft: '16px' }}>
                  <div
                    className={`tree-node-row ${selectedFilePath === 'prisma/schema.prisma' ? 'active' : ''}`}
                    onClick={() => handleSelectFile('prisma/schema.prisma')}
                  >
                    <div className="tree-node-label-group">
                      <span className="material-symbols-outlined" style={{ fontSize: '13px', color: 'var(--tertiary)' }}>
                        database
                      </span>
                      <span>schema.prisma</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Root items */}
            <div style={{ paddingTop: '8px' }}>
              <div className="tree-node-row">
                <div className="tree-node-label-group">
                  <span className="material-symbols-outlined" style={{ fontSize: '13px', color: 'var(--error)' }}>
                    data_object
                  </span>
                  <span>package.json</span>
                </div>
              </div>
              <div className="tree-node-row">
                <div className="tree-node-label-group">
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                    description
                  </span>
                  <span>README.md</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center Panel: Code Viewer */}
        <div className={`ide-editor-pane ${mobilePane === 'code' ? 'pane-mobile-active' : ''}`}>
          <div className="editor-tabstrip">
            <div className="editor-tabstrip-left">
              <div className="editor-tabs-group">
                {openTabs.map((tabPath) => {
                  const fileData = fileContents[tabPath] || { name: tabPath.split('/').pop() };
                  const isActive = selectedFilePath === tabPath;
                  return (
                    <button
                      key={tabPath}
                      type="button"
                      className={`code-tab editor-tab ${isActive ? 'active' : ''}`}
                      onClick={() => handleSelectFile(tabPath)}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '15px', color: isActive ? 'var(--primary)' : 'var(--on-surface-variant)' }}
                      >
                        {tabPath.includes('schema') || tabPath.includes('prisma')
                          ? 'database'
                          : tabPath.endsWith('.json')
                          ? 'data_object'
                          : tabPath.endsWith('.md')
                          ? 'description'
                          : 'code'}
                      </span>
                      <span>{fileData.name}</span>
                      {isActive && (
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--tertiary-container)',
                            marginLeft: '2px',
                            flexShrink: 0
                          }}
                        ></span>
                      )}
                      {openTabs.length > 1 && (
                        <span
                          className="material-symbols-outlined tab-close-btn"
                          onClick={(e) => handleCloseTab(e, tabPath)}
                          title="Close tab"
                        >
                          close
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="tab-meta-info">
                <span>{currentFile.language}</span>
                <span>·</span>
                <span>{currentFile.linesCount} lines</span>
                <span>·</span>
                <span>{currentFile.size}</span>
              </div>
            </div>

            <div className="tab-meta-info tab-encodings-meta">
              <span style={{ backgroundColor: 'var(--surface-container)', padding: '2px 6px', borderRadius: '3px' }}>
                {currentFile.encoding}
              </span>
              <span style={{ backgroundColor: 'var(--surface-container)', padding: '2px 6px', borderRadius: '3px' }}>
                {currentFile.lineEndings}
              </span>
            </div>
          </div>

          <div className="editor-canvas-container">
            <div className="editor-line-numbers">
              {currentFile.code.split('\n').map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            <div className="editor-code-body">
              {isRaw ? (
                <code>{currentFile.code}</code>
              ) : (
                currentFile.code.split('\n').map((line, i) => {
                  let renderedLine = line;
                  return (
                    <div key={i}>
                      {line.includes('const') || line.includes('async') || line.includes('new') || line.includes('try') || line.includes('catch') || line.includes('if') || line.includes('return') ? (
                        <span dangerouslySetInnerHTML={{
                          __html: line
                            .replace(/(const|let|var|async|new|try|catch|if|return|module\.exports|exports)/g, '<span style="color:var(--secondary); font-weight:600;">$1</span>')
                            .replace(/(require|verify|findUnique|startsWith|split|status|json|next)/g, '<span style="color:var(--primary); font-weight:600;">$1</span>')
                            .replace(/('[@\w\/\s\:\.\-]+')/g, '<span style="color:var(--tertiary); font-weight:500;">$1</span>')
                            .replace(/\b(401|400|7d|true|false)\b/g, '<span style="color:var(--error); font-weight:500;">$1</span>')
                        }} />
                      ) : (
                        line.startsWith('/**') || line.startsWith(' *') ? (
                          <span style={{ color: 'rgba(70, 69, 85, 0.6)', fontStyle: 'italic' }}>{line}</span>
                        ) : (
                          line || ' '
                        )
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: AI Code Explanation Drawer */}
        <div className={`ide-ai-drawer ${aiDrawerVisible ? '' : 'hidden'} ${mobilePane === 'ai' ? 'pane-mobile-active' : ''}`}>
          <div className="ai-drawer-header">
            <div className="ai-drawer-title-group">
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>
                psychology
              </span>
              <span className="ai-drawer-title">What this file does</span>
            </div>
            <span className="ai-mentor-badge">AI MENTOR</span>
          </div>

          <div className="ai-drawer-scrollable">
            <div className="ai-insight-card">
              <div className="insight-card-title" style={{ color: 'var(--primary)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  verified
                </span>
                <span>Functional Summary</span>
              </div>
              <p className="insight-card-body">{currentFile.summary}</p>
            </div>

            <div className="ai-insight-card-security">
              <div className="insight-card-title" style={{ color: 'var(--on-surface)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--tertiary-container)' }}>
                  security
                </span>
                <span>Security Assessment</span>
              </div>
              <p className="insight-card-body">{currentFile.securityAssessment}</p>
            </div>

            {currentFile.inboundCallers && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>
                  <span>Used by (Inbound Callers)</span>
                  <span style={{ color: 'var(--on-surface)', fontWeight: 600 }}>
                    {currentFile.inboundCallers.length} routes
                  </span>
                </div>
                <div className="callers-list">
                  {currentFile.inboundCallers.map((caller, i) => (
                    <div key={i} className="caller-item">
                      <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--secondary)' }}>
                        alt_route
                      </span>
                      <span>{caller}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentFile.dependencies && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>
                  <span>Dependencies & Imports</span>
                  <span style={{ color: 'var(--on-surface)', fontWeight: 600 }}>
                    {currentFile.dependencies.length} links
                  </span>
                </div>
                <div className="callers-list">
                  {currentFile.dependencies.map((dep, i) => (
                    <div key={i} className="caller-item" style={{ justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--error)' }}>
                          package_2
                        </span>
                        <span>{dep.name}</span>
                      </div>
                      <span style={{ fontSize: '10px', backgroundColor: 'var(--surface-container)', padding: '2px 6px', borderRadius: '3px' }}>
                        {dep.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentFile.optimizationHint && (
              <div className="ai-insight-card">
                <div className="insight-card-title" style={{ color: 'var(--on-surface)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--primary)' }}>
                    tips_and_updates
                  </span>
                  <span>Optimization Hint</span>
                </div>
                <p className="insight-card-body" style={{ fontSize: '11px' }}>
                  {currentFile.optimizationHint}
                </p>
              </div>
            )}
          </div>

          <div className="ai-drawer-footer">
            <button
              type="button"
              className="btn-ask-ai-full"
              onClick={handleAskAIAboutFile}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                forum
              </span>
              <span>Ask AI About This File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeExplorer;
