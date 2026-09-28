import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout/index.jsx';
import Dashboard from './pages/Dashboard/index.jsx';
import Repositories from './pages/Repositories/index.jsx';
import CodeExplorer from './pages/CodeExplorer/index.jsx';
import Onboarding from './pages/Onboarding/index.jsx';
import AskRepo from './pages/AskRepo/index.jsx';
import Architecture from './pages/Architecture/index.jsx';
import Settings from './pages/Settings/index.jsx';
import { initialRepositories } from './data/repositories.js';
import { initialQuestions } from './data/questions.js';

const App = () => {
  const [repositories, setRepositories] = useState(initialRepositories);
  const [activeRepo, setActiveRepo] = useState(initialRepositories[0]);
  const [questions, setQuestions] = useState(initialQuestions);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, icon = 'check_circle') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, icon }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  const handleSelectRepo = (repo) => {
    setActiveRepo(repo);
    setRepositories((prev) =>
      prev.map((r) => ({
        ...r,
        isActive: r.id === repo.id
      }))
    );
    addToast(`Switched active repository to ${repo.name}`, 'swap_horiz');
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          element={
            <MainLayout
              activeRepo={activeRepo}
              onSelectRepo={handleSelectRepo}
              repositories={repositories}
              isConnectModalOpen={isConnectModalOpen}
              setIsConnectModalOpen={setIsConnectModalOpen}
              isCommandPaletteOpen={isCommandPaletteOpen}
              setIsCommandPaletteOpen={setIsCommandPaletteOpen}
              toasts={toasts}
              addToast={addToast}
            />
          }
        >
          <Route
            index
            element={
              <Dashboard
                repositories={repositories}
                questions={questions}
                onOpenConnectModal={() => setIsConnectModalOpen(true)}
                onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
              />
            }
          />
          <Route
            path="dashboard"
            element={
              <Dashboard
                repositories={repositories}
                questions={questions}
                onOpenConnectModal={() => setIsConnectModalOpen(true)}
                onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
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
            path="settings"
            element={<Settings activeRepo={activeRepo} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
