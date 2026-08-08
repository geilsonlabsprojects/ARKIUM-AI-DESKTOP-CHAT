import { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Layout from "./components/layout/Layout";
import WelcomeScreen from "./components/onboarding/WelcomeScreen";
import ChatPage from "./pages/ChatPage";
import ModelsPage from "./pages/ModelsPage";
import FilesPage from "./pages/FilesPage";
import ProjectsPage from "./pages/ProjectsPage";
import PromptsPage from "./pages/PromptsPage";
import SettingsPage from "./pages/SettingsPage";
import SearchPage from "./pages/SearchPage";
import MemoryPage from "./pages/MemoryPage";
import LogsPage from "./pages/LogsPage";
import { useAppStore } from "./stores/appStore";
import { useSettingsStore } from "./stores/settingsStore";
import { initDatabase } from "./services/database";
import PermissionDialog from "./components/ui/PermissionDialog";
import TerminalConfirmDialog from "./components/ui/TerminalConfirmDialog";

export default function App() {
  const { isFirstRun, setFirstRun } = useAppStore();
  const { theme } = useSettingsStore();
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    // Apply theme
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme === "dark" || theme === "system" ? "dark" : "light");
  }, [theme]);

  useEffect(() => {
    initDatabase().then(() => {
      setDbReady(true);
    }).catch(console.error);
  }, []);

  if (!dbReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-0">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-2 border-arkium-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-400 text-sm">Initializing ARKIUM...</p>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className={theme === "dark" || theme === "system" ? "dark" : ""}>
        {isFirstRun ? (
          <WelcomeScreen onComplete={() => setFirstRun(false)} />
        ) : (
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/chat" replace />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/chat/:id" element={<ChatPage />} />
              <Route path="/models" element={<ModelsPage />} />
              <Route path="/files" element={<FilesPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/prompts" element={<PromptsPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/memory" element={<MemoryPage />} />
              <Route path="/logs" element={<LogsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/chat" replace />} />
            </Routes>
          </Layout>
        )}
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: "bg-surface-3 text-zinc-100 border border-border-1",
            duration: 3000,
            style: {
              background: "#242427",
              color: "#f4f4f5",
              border: "1px solid #27272a",
            },
          }}
        />
        <PermissionDialog />
        <TerminalConfirmDialog />
      </div>
    </HashRouter>
  );
}
