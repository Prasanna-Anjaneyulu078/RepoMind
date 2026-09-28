import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../../components/Sidebar/index.jsx';
import Header from '../../components/Header/index.jsx';
import ConnectModal from '../../components/ConnectModal/index.jsx';
import CommandPalette from '../../components/CommandPalette/index.jsx';
import Toast from '../../components/Toast/index.jsx';
import './index.css';

const MainLayout = ({
  activeRepo,
  onSelectRepo,
  repositories,
  isConnectModalOpen,
  setIsConnectModalOpen,
  isCommandPaletteOpen,
  setIsCommandPaletteOpen,
  toasts,
  addToast
}) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleSync = () => {
    addToast('Sync triggered: Codebase index refreshed to latest Git commit.', 'sync');
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
          addToast('Repository connected successfully!', 'check_circle');
        }}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        repositories={repositories}
      />

      <Toast toasts={toasts} />
    </div>
  );
};

export default MainLayout;
