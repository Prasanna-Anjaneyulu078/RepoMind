import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { fetchApi } from '../../utils/apiClient.js';
import Sidebar from '../../components/Sidebar/index.jsx';
import Header from '../../components/Header/index.jsx';
import ConnectModal from '../../components/ConnectModal/index.jsx';
import Toast from '../../components/Toast/index.jsx';
import './index.css';

const MainLayout = ({
  activeRepo,
  onSelectRepo,
  repositories,
  isConnectModalOpen,
  setIsConnectModalOpen,
  toasts,
  addToast,
  onRefreshRepositories
}) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleSync = async () => {
    if (!activeRepo || !activeRepo.id) return;
    try {
      addToast('Checking repository for changes...', 'sync');
      const data = await fetchApi(`/api/repositories/${activeRepo.id}/sync`, {
        method: 'POST',
        credentials: 'include'
      }, true);

      if (data.success) {
        if (data.upToDate) {
          addToast('Repository is already up to date.', 'check_circle');
        } else {
          addToast('Synchronization started...', 'sync');
          if (onRefreshRepositories) onRefreshRepositories();
        }
      }
    } catch (err) {
      if (err.status === 409) {
        addToast('Synchronization is already in progress.', 'error');
      } else {
        addToast('Unable to sync repository. Please try again.', 'error');
      }
    }
  };

  return (
    <div className="main-layout">
      {/* Mobile Backdrop */}
      {mobileNavOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileNavOpen(false)}
        ></div>
      )}

      {/* Sidebar with mobile class toggle */}
      <Sidebar
        activeRepo={activeRepo}
        onSelectRepo={(repo) => {
          onSelectRepo(repo);
          setMobileNavOpen(false);
        }}
        repositories={repositories}
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      <div className="main-content-wrapper">
        <Header
          activeRepo={activeRepo}
          onSync={handleSync}
          onOpenAskModal={() => setIsCommandPaletteOpen(true)}
          onToggleMobileNav={() => setMobileNavOpen(!mobileNavOpen)}
        />

        <main className="main-container">
          <Outlet />
        </main>
      </div>

      {/* Global Modals */}
      <ConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onConnectSuccess={(url) => {
          if (onRefreshRepositories) onRefreshRepositories();
          addToast('Repository connected successfully!', 'check_circle');
        }}
      />

      <Toast toasts={toasts} />
    </div>
  );
};

export default MainLayout;
