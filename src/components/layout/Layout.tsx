import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import StatusBar from "./StatusBar";
import { useAppStore } from "../../stores/appStore";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { sidebarCollapsed } = useAppStore();

  return (
    <div className="flex h-screen bg-surface-0 overflow-hidden">
      <Sidebar />
      <main
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200`}
      >
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
        <StatusBar />
      </main>
    </div>
  );
}
