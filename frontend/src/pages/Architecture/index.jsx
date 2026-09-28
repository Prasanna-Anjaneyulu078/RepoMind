import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './index.css';

const architectureLayers = [
  {
    layerName: 'Client Tier',
    badge: 'LAYER 1',
    description: 'React SPA serving student portal, recruiter drive administration, and placement analytics dashboards.',
    nodes: [
      {
        id: 'client-app',
        name: 'client/src/App.jsx',
        type: 'React SPA',
        icon: 'devices',
        file: 'client/src/App.jsx',
        desc: 'Root component providing client routing, authentication context, and navigation guards.'
      },
      {
        id: 'client-views',
        name: 'JobDetails.jsx',
        type: 'Views & Forms',
        icon: 'table_view',
        file: 'client/src/components/JobDetails.jsx',
        desc: 'Interactive drive application submission and dynamic student resume upload container.'
      }
    ]
  },
  {
    layerName: 'API & Gateway Tier',
    badge: 'LAYER 2',
    description: 'Express REST services, route mapping controllers, and perimeter security guards.',
    nodes: [
      {
        id: 'auth-middleware',
        name: 'authMiddleware.js',
        type: 'Security Guard',
        icon: 'shield',
        file: 'server/middleware/authMiddleware.js',
        desc: 'Validates Bearer authorization headers and extracts JWT role identity.'
      },
      {
        id: 'rate-limiter',
        name: 'rateLimiter.js',
        type: 'Traffic Guard',
        icon: 'speed',
        file: 'server/middleware/rateLimiter.js',
        desc: 'Mitigates DDoS and abusive credential brute-force attacks via token bucket algorithms.'
      },
      {
        id: 'auth-routes',
        name: 'authRoutes.js',
        type: 'Express Router',
        icon: 'alt_route',
        file: 'server/routes/authRoutes.js',
        desc: 'Directs /api/auth/login and /api/auth/register traffic to AuthController handlers.'
      }
    ]
  },
  {
    layerName: 'Business Logic & Services Tier',
    badge: 'LAYER 3',
    description: 'Placement drive rule engine, candidate qualification algorithms, and application workflows.',
    nodes: [
      {
        id: 'eligibility-service',
        name: 'eligibilityService.js',
        type: 'Domain Engine',
        icon: 'rule',
        file: 'server/services/eligibilityService.js',
        desc: 'Computes whether student CGPA, backlogs, and branch fulfill corporate drive criteria.'
      },
      {
        id: 'app-controller',
        name: 'applicationController.js',
        type: 'MVC Controller',
        icon: 'settings_suggest',
        file: 'server/controllers/applicationController.js',
        desc: 'Coordinates applicant status changes from Applied -> Shortlisted -> Hired.'
      }
    ]
  },
  {
    layerName: 'Persistence Tier',
    badge: 'LAYER 4',
    description: 'PostgreSQL relational database managed through Prisma ORM schemas.',
    nodes: [
      {
        id: 'prisma-schema',
        name: 'schema.prisma',
        type: 'ORM Data Model',
        icon: 'database',
        file: 'prisma/schema.prisma',
        desc: '14 tables with strict relations (User, StudentProfile, JobDrive, Application).'
      }
    ]
  }
];

const Architecture = ({ activeRepo }) => {
  const [selectedNode, setSelectedNode] = useState(architectureLayers[1].nodes[0]);
  const navigate = useNavigate();

  return (
    <div className="architecture-page">
      <div className="arch-header">
        <div>
          <h1 className="arch-title">System Architecture</h1>
          <p className="arch-subtitle">
            Three-tier component decomposition and data flow for{' '}
            <strong style={{ color: 'var(--on-surface)' }}>
              {activeRepo ? activeRepo.name : 'VVITU_Placement_Portal'}
            </strong>
          </p>
        </div>

        <button
          type="button"
          className="btn-action-light"
          onClick={() => navigate('/code-explorer')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            terminal
          </span>
          <span>View in Code Explorer</span>
        </button>
      </div>

      <div className="arch-topology-layout">
        {/* Left: Architecture Layers */}
        <div className="arch-layers-flow">
          {architectureLayers.map((layer, lIdx) => (
            <div key={lIdx} className="arch-layer-card">
              <div className="layer-header">
                <div className="layer-title-group">
                  <span className="layer-badge">{layer.badge}</span>
                  <h2 className="layer-title">{layer.layerName}</h2>
                </div>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                {layer.description}
              </p>

              <div className="layer-nodes-grid">
                {layer.nodes.map((node) => (
                  <div
                    key={node.id}
                    className={`arch-node-box ${selectedNode && selectedNode.id === node.id ? 'selected' : ''}`}
                    onClick={() => setSelectedNode(node)}
                  >
                    <div className="node-box-top">
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--primary)' }}>
                        {node.icon}
                      </span>
                      <span>{node.name}</span>
                    </div>
                    <span className="node-box-meta">{node.type}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right: Component Inspector Panel */}
        <div className="arch-inspector-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--primary)' }}>
              {selectedNode ? selectedNode.icon : 'account_tree'}
            </span>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--on-surface)' }}>
                {selectedNode ? selectedNode.name : 'Select a component'}
              </h3>
              <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>
                {selectedNode ? selectedNode.type : ''}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--on-surface-variant)', fontWeight: 600 }}>
              Description
            </span>
            <p style={{ fontSize: '13px', lineHeight: '20px', color: 'var(--on-surface)' }}>
              {selectedNode ? selectedNode.desc : ''}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--on-surface-variant)', fontWeight: 600 }}>
              Source File Reference
            </span>
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: 'var(--surface-container-low)',
                fontFamily: 'var(--font-family-mono)',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>{selectedNode ? selectedNode.file : ''}</span>
              <button
                type="button"
                onClick={() => navigate('/code-explorer')}
                style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '11px' }}
              >
                Inspect
              </button>
            </div>
          </div>

          <button
            type="button"
            className="btn-connect-repo"
            style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}
            onClick={() =>
              navigate('/ask-repo', {
                state: { prefilledQuery: `Explain how ${selectedNode.name} fits into the system architecture` }
              })
            }
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              forum
            </span>
            <span>Ask AI About This Component</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Architecture;
