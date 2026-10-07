import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import RepositoryCard from '../../components/RepositoryCard/index.jsx';
import { fetchApi } from '../../utils/apiClient.js';
import './index.css';

const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} ${diffInHours === 1 ? 'hr' : 'hrs'} ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const Dashboard = ({ onSelectRepo, onOpenConnectModal }) => {
  const navigate = useNavigate();
  const [recentQuestions, setRecentQuestions] = useState([]);
  const [recentRepositories, setRecentRepositories] = useState([]);

  const handleOpenRepo = (repo) => {
    onSelectRepo(repo);
    navigate('/code-explorer');
  };

  useEffect(() => {
    let isMounted = true;
    const fetchDashboard = async () => {
      try {
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const data = await fetchApi(`${backendUrl}/api/dashboard`, {
          credentials: 'include'
        });
        if (data.success && isMounted) {
          setRecentQuestions(data.data.recentQuestions || []);
          setRecentRepositories(data.data.recentRepositories || []);
        }
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      }
    };
    fetchDashboard();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-subtitle">Workspace overview and recent activity across your repositories.</p>
      </header>

      <section className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">Recent Repositories</h2>
          <Link to="/repositories" className="section-link">
            View all repositories
          </Link>
        </div>

        {recentRepositories.length === 0 ? (
          <div className="empty-state-card">
            <h3 className="empty-state-title">No repositories connected yet.</h3>
            <p className="empty-state-subtitle">Connect a repository to start exploring your codebase.</p>
            <button
              type="button"
              className="btn-action-primary"
              onClick={onOpenConnectModal}
            >
              Connect Repository
            </button>
          </div>
        ) : (
          <div className="repos-grid-list">
            {recentRepositories.map((repo) => (
              <RepositoryCard key={repo.id} repo={repo} variant="compact" onOpenRepo={handleOpenRepo} />
            ))}
          </div>
        )}
      </section>

      <div className="dashboard-split-layout">
        <section className="dashboard-section questions-section">
          <div className="section-header">
            <h2 className="section-title">Recent Questions</h2>
          </div>
          
          {recentQuestions.length === 0 ? (
            <div className="empty-state-card">
              <h3 className="empty-state-title">No questions yet.</h3>
              <p className="empty-state-subtitle">Start exploring your repository with Ask Repo.</p>
              <button
                type="button"
                className="btn-action-primary"
                onClick={() => navigate('/ask-repo')}
              >
                Ask Repo
              </button>
            </div>
          ) : (
            <div className="questions-list">
              {recentQuestions.map((q) => (
                <div 
                  key={q.id} 
                  className="question-item-card" 
                  onClick={() => navigate('/ask-repo')}
                >
                  <div className="question-text">
                    {q.question.trim()}
                  </div>
                  <div className="question-meta-row">
                    <span className="question-repo-name">{q.repositoryName}</span>
                    <span className="question-timestamp">{formatRelativeTime(q.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-section quick-access-section">
          <div className="section-header">
            <h2 className="section-title">Quick Access</h2>
          </div>
          <div className="quick-access-list">
            <button className="quick-access-card" onClick={() => navigate('/ask-repo')}>
              <div className="quick-access-content">
                <span className="quick-access-title">Ask Repo</span>
                <span className="quick-access-desc">Ask questions about your codebase</span>
              </div>
              <span className="material-symbols-outlined quick-access-arrow">arrow_forward</span>
            </button>
            <button className="quick-access-card" onClick={() => navigate('/code-explorer')}>
              <div className="quick-access-content">
                <span className="quick-access-title">Code Explorer</span>
                <span className="quick-access-desc">Browse repository source code</span>
              </div>
              <span className="material-symbols-outlined quick-access-arrow">arrow_forward</span>
            </button>
            <button className="quick-access-card" onClick={() => navigate('/architecture')}>
              <div className="quick-access-content">
                <span className="quick-access-title">Architecture</span>
                <span className="quick-access-desc">Explore system structure</span>
              </div>
              <span className="material-symbols-outlined quick-access-arrow">arrow_forward</span>
            </button>
            <button className="quick-access-card" onClick={() => navigate('/onboarding')}>
              <div className="quick-access-content">
                <span className="quick-access-title">Onboarding</span>
                <span className="quick-access-desc">Learn the repository step by step</span>
              </div>
              <span className="material-symbols-outlined quick-access-arrow">arrow_forward</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
