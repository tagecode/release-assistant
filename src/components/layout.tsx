import { Outlet } from "react-router-dom";
import { Sidebar, NavItem } from "./sidebar";

interface LayoutProps {
  navItems: NavItem[];
}

export function Layout({ navItems }: LayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar navItems={navItems} />
      <main className="flex-1 overflow-y-auto bg-background">
        <Outlet />
      </main>
    </div>
  );
}
