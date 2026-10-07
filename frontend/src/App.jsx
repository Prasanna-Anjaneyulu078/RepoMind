import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout/index.jsx';
import Dashboard from './pages/Dashboard/index.jsx';
import Repositories from './pages/Repositories/index.jsx';
import CodeExplorer from './pages/CodeExplorer/index.jsx';
import Onboarding from './pages/Onboarding/index.jsx';
import AskRepo from './pages/AskRepo/index.jsx';
import Architecture from './pages/Architecture/index.jsx';
import Login from './pages/Login/index.jsx';
import AuthSuccess from './pages/AuthSuccess/index.jsx';
import Profile from './pages/Profile/index.jsx';
import ProtectedRoute from './components/ProtectedRoute/index.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { fetchApi } from './utils/apiClient.js';

const App = () => {
  const { user } = useAuth();
  const [repositories, setRepositories] = useState([]);
  const [activeRepo, setActiveRepo] = useState(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [isRepositoriesLoading, setIsRepositoriesLoading] = useState(true);

  const fetchRepositories = async (isMounted = true) => {
    if (!user) {
      if (isMounted) {
        setRepositories([]);
        setActiveRepo(null);
        setIsRepositoriesLoading(false);
      }
      return;
    }

    setIsRepositoriesLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const data = await fetchApi(`${backendUrl}/api/repositories`, {
        credentials: 'include'
      }, false, () => fetchRepositories(isMounted));

      if (data.success && isMounted) {
        setRepositories(data.data);
        const savedRepoId = localStorage.getItem('repomind_active_repo_id');
        
        let nextActiveRepo = null;
        if (savedRepoId) {
          nextActiveRepo = data.data.find(r => r.id === savedRepoId);
        }
        
        if (!nextActiveRepo && data.data.length > 0) {
          nextActiveRepo = data.data[0];
        }
        
        setActiveRepo(nextActiveRepo);
        if (nextActiveRepo) {
          localStorage.setItem('repomind_active_repo_id', nextActiveRepo.id);
        } else {
          localStorage.removeItem('repomind_active_repo_id');
        }
      }
    } catch (err) {
      console.error("Failed to load repositories:", err);
    } finally {
      if (isMounted) {
        setIsRepositoriesLoading(false);
      }
    }
  };

  React.useEffect(() => {
    let isMounted = true;
    fetchRepositories(isMounted);
    return () => {
      isMounted = false;
    };
  }, [user]);

  const addToast = (message, icon = 'check_circle') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, icon }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  const handleSelectRepo = (repo) => {
    setActiveRepo(repo);
    localStorage.setItem('repomind_active_repo_id', repo.id);
    setRepositories((prev) =>
      prev.map((r) => ({
        ...r,
        isActive: r.id === repo.id
      }))
    );
    addToast(`Switched active repository to ${repo.name}`, 'swap_horiz');
  };

  const handleDeleteRepoAppLevel = (repo) => {
    setRepositories(prev => {
      const next = prev.filter(r => r.id !== repo.id);
      if (activeRepo && activeRepo.id === repo.id) {
        if (next.length > 0) {
          setActiveRepo(next[0]);
        } else {
          setActiveRepo(null);
        }
      }
      return next;
    });
    fetchRepositories(true); // Sync with backend
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/success" element={<AuthSuccess />} />
        
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout
                activeRepo={activeRepo}
                onSelectRepo={handleSelectRepo}
                repositories={repositories}
                isConnectModalOpen={isConnectModalOpen}
                setIsConnectModalOpen={setIsConnectModalOpen}
                toasts={toasts}
                addToast={addToast}
                onRefreshRepositories={() => fetchRepositories(true)}
              />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={
              <Dashboard
                onSelectRepo={handleSelectRepo}
                onOpenConnectModal={() => setIsConnectModalOpen(true)}
              />
            }
          />
          <Route
            path="dashboard"
            element={
              <Dashboard
                onSelectRepo={handleSelectRepo}
                onOpenConnectModal={() => setIsConnectModalOpen(true)}
              />
            }
          />
          <Route
            path="repositories"
            element={
              <Repositories
                repositories={repositories}
                onSelectRepo={handleSelectRepo}
                onOpenConnectModal={() => setIsConnectModalOpen(true)}
                onRepoDeleted={handleDeleteRepoAppLevel}
              />
            }
          />
          <Route
            path="code-explorer"
            element={<CodeExplorer activeRepo={activeRepo} />}
          />
          <Route
            path="onboarding"
            element={<Onboarding activeRepo={activeRepo} />}
          />
          <Route
            path="ask-repo"
            element={<AskRepo activeRepo={activeRepo} />}
          />
          <Route
            path="architecture"
            element={<Architecture activeRepo={activeRepo} />}
          />
          <Route
            path="profile"
            element={<Profile repositories={repositories} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
