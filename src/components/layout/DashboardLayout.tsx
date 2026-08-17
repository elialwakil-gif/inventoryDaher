import { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";
import ScreenWrapper from "../ui/ScreenWrapper";
import { Sheet, SheetContent } from "../ui/sheet";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <ScreenWrapper>
      <div className="flex h-dvh min-h-0 overflow-hidden text-foreground">
        <Sidebar
          isCollapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
          className="hidden md:flex"
        />
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent
            side="right"
            className="w-[84vw] max-w-80 p-0 sm:max-w-80"
          >
            <Sidebar
              isCollapsed={false}
              onToggle={() => setMobileSidebarOpen(false)}
              isMobile
              onNavigate={() => setMobileSidebarOpen(false)}
            />
          </SheetContent>
        </Sheet>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header onToggleSidebar={() => setMobileSidebarOpen(true)} />
          <main
            className={cn(
              "min-w-0 flex-1 overflow-auto p-3 sm:p-4 md:p-6 lg:p-8",
              "transition-all duration-300",
            )}
          >
            <div dir="rtl" className="mx-auto w-full min-w-0 max-w-7xl space-y-4 md:space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </ScreenWrapper>
  );
}
