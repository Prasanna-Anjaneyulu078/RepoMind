import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { initialOnboardingSteps } from '../../data/onboarding.js';
import './index.css';

const Onboarding = ({ activeRepo }) => {
  const [steps, setSteps] = useState(initialOnboardingSteps);
  const [activeStepId, setActiveStepId] = useState(3);
  const [checklist, setChecklist] = useState([
    { id: 'c1', label: 'Trace login route handler & verify credential validation logic', checked: true },
    { id: 'c2', label: 'Inspect JWT payload claims for role identity fields', checked: true },
    { id: 'c3', label: 'Test unauthorized request response behavior (401 vs 403 handling)', checked: false }
  ]);
  const [verified, setVerified] = useState(false);
  const navigate = useNavigate();

  const checkedCount = checklist.filter((item) => item.checked).length;
  const totalCount = checklist.length;

  const toggleChecklistItem = (id) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleMarkComplete = () => {
    setChecklist((prev) => prev.map((item) => ({ ...item, checked: true })));
    setVerified(true);
  };

  return (
    <div className="onboarding-page">
      {/* Top Header Summary & Telemetry */}
      <div className="onboarding-hero-card">
        <div className="hero-glow-1"></div>
        <div className="hero-glow-2"></div>

        <div className="onboarding-hero-top">
          <div className="onboarding-title-col">
            <div className="onboarding-tagline-row">
              <span className="repo-badge-active">
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary)',
                    display: 'inline-block'
                  }}
                ></span>
                {activeRepo ? activeRepo.name : 'VVITU_Placement_Portal'}
              </span>
              <span style={{ color: 'var(--outline-variant)', fontSize: '11px' }}>/</span>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontFamily: 'var(--font-family-mono)',
                  fontSize: '11px',
                  color: 'var(--on-surface-variant)'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                  fork_right
                </span>
                {activeRepo ? activeRepo.branch : 'main'}
              </span>
              <span className="track-active-badge">Onboarding Track Active</span>
            </div>

            <h1 className="onboarding-heading">Repository Onboarding</h1>
            <p className="onboarding-desc">
              Learn this codebase step by step with AI-curated walkthroughs, structured code paths, and guided inspections.
            </p>
          </div>

          <div className="onboarding-progress-metric">
            <div className="progress-ring-container">
              <svg className="progress-ring-svg" viewBox="0 0 64 64">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="var(--surface-container-highest)"
                  strokeWidth="4.5"
                ></circle>
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="var(--primary-container)"
                  strokeWidth="4.5"
                  strokeDasharray="175.9"
                  strokeDashoffset={verified ? '35' : '70.3'}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                ></circle>
              </svg>
              <div className="progress-ring-percent">{verified ? '80%' : '60%'}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--on-surface-variant)', fontWeight: 600 }}>
                Progress State
              </span>
              <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--on-surface)', marginTop: '2px' }}>
                {verified ? '4 of 5 Steps Finished' : '3 of 5 Steps Finished'}
              </span>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontFamily: 'var(--font-family-mono)',
                  fontSize: '11px',
                  color: 'var(--tertiary)',
                  marginTop: '4px',
                  fontWeight: 600
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                  bolt
                </span>
                Est. completion ~25 mins
              </span>
            </div>
          </div>
        </div>

        {/* Horizontal Connected Stepper */}
        <div className="horizontal-stepper-wrapper">
          <div className="stepper-grid">
            <div className="stepper-bg-line"></div>
            <div
              className="stepper-progress-line"
              style={{ width: verified ? '70%' : '50%' }}
            ></div>

            {/* Step 1 */}
            <div className="step-node" onClick={() => setActiveStepId(1)}>
              <div className="step-circle-icon step-circle-complete">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  check
                </span>
              </div>
              <span className="step-node-title">1. Project Intent</span>
              <span className="step-node-status status-complete-tag">Complete</span>
            </div>

            {/* Step 2 */}
            <div className="step-node" onClick={() => setActiveStepId(2)}>
              <div className="step-circle-icon step-circle-complete">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  check
                </span>
              </div>
              <span className="step-node-title">2. Architecture</span>
              <span className="step-node-status status-complete-tag">Complete</span>
            </div>

            {/* Step 3 */}
            <div className="step-node" onClick={() => setActiveStepId(3)}>
              <div
                className={`step-circle-icon ${verified ? 'step-circle-complete' : 'step-circle-active'}`}
              >
                {verified ? (
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    check
                  </span>
                ) : (
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary-container)'
                    }}
                  ></span>
                )}
              </div>
              <span className="step-node-title" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                3. Authentication
              </span>
              <span className="step-node-status status-active-tag">
                {verified ? 'Completed' : 'In Progress'}
              </span>
            </div>

            {/* Step 4 */}
            <div className="step-node" onClick={() => setActiveStepId(4)}>
              <div className="step-circle-icon step-circle-upcoming">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  circle
                </span>
              </div>
              <span className="step-node-title">4. Core Features</span>
              <span className="step-node-status" style={{ color: 'var(--on-surface-variant)' }}>
                Upcoming
              </span>
            </div>

            {/* Step 5 */}
            <div className="step-node" onClick={() => setActiveStepId(5)}>
              <div className="step-circle-icon step-circle-upcoming">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  flag
                </span>
              </div>
              <span className="step-node-title">5. First Patch</span>
              <span className="step-node-status" style={{ color: 'var(--on-surface-variant)' }}>
                Upcoming
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stepper Content Canvas */}
      <div className="onboarding-content-grid">
        {/* Left Column: Steps Flow & Timeline */}
        <div className="steps-timeline-col">
          {/* STEP 1: Understand Project */}
          <div className="step-summary-card">
            <div className="step-card-left">
              <div className="step-status-icon-circle icon-circle-complete">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  done
                </span>
              </div>
              <div className="step-card-body">
                <div className="step-badge-row">
                  <span className="step-number-tag">Step 01</span>
                  <span style={{ color: 'var(--outline-variant)' }}>•</span>
                  <h3 className="step-card-title">Understand the Project</h3>
                  <span className="tag-badge" style={{ color: 'var(--tertiary)' }}>
                    Completed
                  </span>
                </div>
                <p className="step-card-desc">
                  Placement & recruitment portal managing campus drives, applicant eligibility filters, and company coordination.
                </p>
                <div className="inspected-files-row">
                  <span style={{ color: 'var(--on-surface-variant)' }}>Inspected:</span>
                  <span className="file-chip">README.md</span>
                  <span className="file-chip">package.json</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn-action-light"
              onClick={() => navigate('/code-explorer')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                visibility
              </span>
              <span>Review Summary</span>
            </button>
          </div>

          {/* STEP 2: Understand Architecture */}
          <div className="step-summary-card">
            <div className="step-card-left">
              <div className="step-status-icon-circle icon-circle-complete">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  done
                </span>
              </div>
              <div className="step-card-body">
                <div className="step-badge-row">
                  <span className="step-number-tag">Step 02</span>
                  <span style={{ color: 'var(--outline-variant)' }}>•</span>
                  <h3 className="step-card-title">Understand the Architecture</h3>
                  <span className="tag-badge" style={{ color: 'var(--tertiary)' }}>
                    Completed
                  </span>
                </div>
                <p className="step-card-desc">
                  Three-tier MVC architecture: React SPA → Express REST API → Business Services & Controllers → Prisma ORM → PostgreSQL database.
                </p>
                <div className="inspected-files-row">
                  <span style={{ color: 'var(--on-surface-variant)' }}>Inspected:</span>
                  <span className="file-chip">server.js</span>
                  <span className="file-chip">client/src/App.jsx</span>
                  <span className="file-chip">prisma/schema.prisma</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn-action-light"
              onClick={() => navigate('/architecture')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                account_tree
              </span>
              <span>View Architecture</span>
            </button>
          </div>

          {/* STEP 3: Active Step */}
          <div className="active-step-card">
            <div className="active-step-bar"></div>

            <div className="active-step-header">
              <div className="active-step-header-left">
                <span className="active-step-number-badge">3</span>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--on-surface)' }}>
                  Explore Authentication
                </h2>
                <span className="badge-active-pill">
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--on-primary)'
                    }}
                  ></span>
                  {verified ? 'Step Verified' : 'Active Step'}
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                Module 3 of 5
              </span>
            </div>

            <p style={{ fontSize: '13px', lineHeight: '20px', color: 'var(--on-surface)' }}>
              Learn how user identity, session handling, and role authorization (
              <code style={{ backgroundColor: 'var(--surface-container)', padding: '2px 6px', borderRadius: '3px', color: 'var(--primary)', fontFamily: 'var(--font-family-mono)' }}>
                STUDENT
              </code>{' '}
              vs{' '}
              <code style={{ backgroundColor: 'var(--surface-container)', padding: '2px 6px', borderRadius: '3px', color: 'var(--primary)', fontFamily: 'var(--font-family-mono)' }}>
                RECRUITER
              </code>{' '}
              /{' '}
              <code style={{ backgroundColor: 'var(--surface-container)', padding: '2px 6px', borderRadius: '3px', color: 'var(--primary)', fontFamily: 'var(--font-family-mono)' }}>
                ADMIN
              </code>
              ) are securely enforced across Express route guards.
            </p>

            {/* Mentor Walkthrough Guide */}
            <div className="mentor-guide-panel">
              <div className="mentor-guide-top">
                <div className="mentor-guide-title">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    cognition
                  </span>
                  <span>Mentor Walkthrough Guide</span>
                </div>
                <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                  JWT + Bearer Token Architecture
                </span>
              </div>

              <div className="mentor-guide-items-list">
                <div className="guide-step-row">
                  <span className="guide-step-num">01</span>
                  <div className="guide-step-content">
                    <span className="guide-step-heading">Token Issuance:</span> Handled in{' '}
                    <code style={{ color: 'var(--primary)', fontFamily: 'var(--font-family-mono)', fontWeight: 600 }}>
                      server/controllers/authController.js
                    </code>{' '}
                    via the login route. Compares passwords using bcrypt.compare and generates JWTs packed with role claims.
                  </div>
                </div>

                <div className="guide-step-row">
                  <span className="guide-step-num">02</span>
                  <div className="guide-step-content">
                    <span className="guide-step-heading">Token Verification:</span> Middleware in{' '}
                    <code style={{ color: 'var(--primary)', fontFamily: 'var(--font-family-mono)', fontWeight: 600 }}>
                      server/middleware/authMiddleware.js
                    </code>{' '}
                    intercepts requests, extracts authorization Bearer tokens, decodes the signature, and hydrates req.user.
                  </div>
                </div>

                <div className="guide-step-row">
                  <span className="guide-step-num">03</span>
                  <div className="guide-step-content">
                    <span className="guide-step-heading">Role Protection:</span> Role interceptors block students from invoking recruiter drive management APIs, rejecting unauthorized scopes with standard HTTP 403 status payloads.
                  </div>
                </div>
              </div>
            </div>

            {/* Relevant Key Source Files */}
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--on-surface-variant)', fontWeight: 600, letterSpacing: '0.05em' }}>
                Key Source Files for this Step
              </span>
              <div className="key-files-grid" style={{ marginTop: '8px' }}>
                <div
                  className="key-file-card"
                  onClick={() => navigate('/code-explorer')}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--on-surface)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--primary)' }}>
                        javascript
                      </span>
                      <strong style={{ fontFamily: 'var(--font-family-mono)', fontSize: '11px' }}>
                        authController.js
                      </strong>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '4px' }}>
                      Lines 18-64 • Issue tokens
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--primary)', fontSize: '11px', fontWeight: 600 }}>
                    <span>Explore File</span>
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                      arrow_forward
                    </span>
                  </div>
                </div>

                <div
                  className="key-file-card"
                  onClick={() => navigate('/code-explorer')}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--on-surface)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--primary)' }}>
                        shield
                      </span>
                      <strong style={{ fontFamily: 'var(--font-family-mono)', fontSize: '11px' }}>
                        authMiddleware.js
                      </strong>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '4px' }}>
                      Lines 9-33 • Bearer guards
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--primary)', fontSize: '11px', fontWeight: 600 }}>
                    <span>Explore File</span>
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                      arrow_forward
                    </span>
                  </div>
                </div>

                <div
                  className="key-file-card"
                  onClick={() => navigate('/code-explorer')}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--on-surface)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--primary)' }}>
                        route
                      </span>
                      <strong style={{ fontFamily: 'var(--font-family-mono)', fontSize: '11px' }}>
                        authRoutes.js
                      </strong>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '4px' }}>
                      Lines 1-28 • Route mappings
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--primary)', fontSize: '11px', fontWeight: 600 }}>
                    <span>Explore File</span>
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                      arrow_forward
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Verification Checklist */}
            <div className="checklist-panel">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--on-surface)' }}>
                  Knowledge Verification Checklist
                </span>
                <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '11px', color: 'var(--tertiary)', fontWeight: 600 }}>
                  {checkedCount} of {totalCount} Checked
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {checklist.map((item) => (
                  <label key={item.id} className="checklist-item">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleChecklistItem(item.id)}
                      style={{ accentColor: 'var(--primary-container)', width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '11px', color: item.checked ? 'var(--on-surface)' : 'var(--primary)', fontWeight: item.checked ? 400 : 600 }}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions Row */}
            <div className="active-step-actions-row">
              <div className="active-step-actions-group">
                <button
                  type="button"
                  className={verified ? 'btn-action-primary-light' : 'btn-connect-repo'}
                  onClick={handleMarkComplete}
                  style={verified ? { backgroundColor: 'var(--tertiary-fixed)', color: 'var(--on-tertiary-fixed-variant)' } : {}}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    {verified ? 'verified' : 'check_circle'}
                  </span>
                  <span>{verified ? 'Step 3 Verified!' : 'Mark Step as Complete'}</span>
                </button>

                <button
                  type="button"
                  className="btn-action-light"
                  onClick={() => navigate('/code-explorer')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    terminal
                  </span>
                  <span>Open in Code Explorer</span>
                </button>
              </div>

              <div className="active-step-timestamp">
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                  history
                </span>
                <span>Last auto-checkpoint 4 mins ago</span>
              </div>
            </div>
          </div>

          {/* STEP 4: Upcoming Locked */}
          <div className="step-summary-card locked">
            <div className="step-card-left">
              <div className="step-status-icon-circle icon-circle-locked">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  lock_open
                </span>
              </div>
              <div className="step-card-body">
                <div className="step-badge-row">
                  <span className="step-number-tag">Step 04</span>
                  <span style={{ color: 'var(--outline-variant)' }}>•</span>
                  <h3 className="step-card-title">Explore Core Features</h3>
                  <span className="tag-badge">Locked</span>
                </div>
                <p className="step-card-desc">
                  Deep dive into job posting creation, application submission workflows, and automatic CGPA validation algorithms.
                </p>
                <div className="inspected-files-row">
                  <span style={{ color: 'var(--on-surface-variant)' }}>Files targeted:</span>
                  <span className="file-chip">applicationController.js</span>
                  <span className="file-chip">eligibilityService.js</span>
                </div>
              </div>
            </div>
            <button type="button" className="btn-action-light">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                visibility
              </span>
              <span>Preview</span>
            </button>
          </div>

          {/* STEP 5: Final Goal */}
          <div className="step-summary-card locked">
            <div className="step-card-left">
              <div className="step-status-icon-circle icon-circle-locked">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  flag
                </span>
              </div>
              <div className="step-card-body">
                <div className="step-badge-row">
                  <span className="step-number-tag">Step 05</span>
                  <span style={{ color: 'var(--outline-variant)' }}>•</span>
                  <h3 className="step-card-title">Start Contributing</h3>
                  <span className="tag-badge" style={{ backgroundColor: 'rgba(234, 221, 255, 0.5)', color: 'var(--secondary)' }}>
                    Final Goal
                  </span>
                </div>
                <p className="step-card-desc">
                  First good issue: Add phone number format validation and resume upload size limit guard on application forms.
                </p>
                <div className="inspected-files-row">
                  <span style={{ color: 'var(--on-surface-variant)' }}>Recommended files:</span>
                  <span className="file-chip">userValidator.js</span>
                  <span className="file-chip">JobDetails.jsx</span>
                </div>
              </div>
            </div>
            <button type="button" className="btn-action-light">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                preview
              </span>
              <span>Issue Details</span>
            </button>
          </div>
        </div>

        {/* Right Column: Code Inspector Snippet & Team Context */}
        <div className="onboarding-inspector-col">
          {/* Active Code Snippet Card */}
          <div className="snippet-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>
                  data_object
                </span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--on-surface)' }}>
                  Active Code Snippet
                </span>
              </div>
              <span className="tag-badge" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                authMiddleware.js
              </span>
            </div>

            <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
              Inspecting Bearer validation token unpacking & student claims extraction.
            </p>

            <div className="terminal-code-box">
              <div className="terminal-header">
                <div className="terminal-dots">
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--error)' }}></span>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--surface-container-highest)' }}></span>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--tertiary-fixed)' }}></span>
                  <span style={{ marginLeft: '4px', color: 'var(--surface-dim)' }}>verifyToken()</span>
                </div>
                <span>Lines 14-26</span>
              </div>

              <pre className="terminal-pre">
                <span style={{ color: 'var(--tertiary-fixed)' }}>const</span> token = req.headers.authorization?.split(<span style={{ color: 'var(--primary-fixed-dim)' }}>' '</span>)[1];{'\n'}
                <span style={{ color: 'var(--tertiary-fixed)' }}>if</span> (!token) {'{'}{'\n'}
                {'  '}<span style={{ color: 'var(--tertiary-fixed)' }}>return</span> res.status(401).json({'{'} msg: <span style={{ color: 'var(--primary-fixed-dim)' }}>'No token, unauthorized'</span> {'}'});{'\n'}
                {'}'}{'\n\n'}
                <span style={{ color: 'var(--tertiary-fixed)' }}>try</span> {'{'}{'\n'}
                {'  '}<span style={{ color: 'var(--tertiary-fixed)' }}>const</span> decoded = jwt.verify(token, process.env.JWT_SECRET);{'\n'}
                {'  '}req.user = decoded; <span style={{ color: 'var(--outline-variant)' }}>// Contains role: 'STUDENT'</span>{'\n'}
                {'  '}next();{'\n'}
                {'}'} <span style={{ color: 'var(--tertiary-fixed)' }}>catch</span> (err) {'{'}{'\n'}
                {'  '}res.status(401).json({'{'} msg: <span style={{ color: 'var(--primary-fixed-dim)' }}>'Token expired or malformed'</span> {'}'});{'\n'}
                {'}'}
              </pre>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
              <button
                type="button"
                onClick={() => navigate('/code-explorer')}
                style={{ color: 'var(--primary)', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  code
                </span>
                <span>Open full file view</span>
              </button>
              <span style={{ fontSize: '11px', color: 'var(--outline)' }}>UTF-8 • Node.js</span>
            </div>
          </div>

          {/* Mentorship Context Card */}
          <div className="repo-context-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--tertiary)' }}>
                groups
              </span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--on-surface)' }}>
                Repository Context
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="context-row">
                <span style={{ color: 'var(--on-surface-variant)' }}>Active Maintainers</span>
                <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600 }}>4 developers</span>
              </div>
              <div className="context-row">
                <span style={{ color: 'var(--on-surface-variant)' }}>Default Branch</span>
                <span className="file-chip">main</span>
              </div>
              <div className="context-row">
                <span style={{ color: 'var(--on-surface-variant)' }}>Total Dependencies</span>
                <span style={{ fontFamily: 'var(--font-family-mono)' }}>32 packages</span>
              </div>
              <div className="context-row">
                <span style={{ color: 'var(--on-surface-variant)' }}>Test Coverage</span>
                <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--tertiary)', fontWeight: 600 }}>
                  78.4% passing
                </span>
              </div>
            </div>

            <div className="lead-dev-quote-card">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDK7utkVI0mA2e8m7fwtRCUDGLHa18fV6m4w0DreCJuY5MjyR2vn1wQWbNGSiV3_7xM0wMZjfGAGsBUvtPEPPvHSx0pZ0pe_R_enQXIsEjrBqYJEtqlVuvcdNu-MjTBPKDaOyconrc8et3q6YSgOwjvCCJxSe3SKzVgZzzw95RWMj3dRACPIQN3zc99Lo1I4soh07LCFdSKXLhwUAgFVzoB98v192nVcaTrQ5n7rPGC1n2FjSYLwXiO"
                alt="Devon Vance"
                className="lead-avatar"
              />
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--on-surface)' }}>
                  Devon Vance (Lead)
                </span>
                <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>
                  "Review auth routes before PRing changes."
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
