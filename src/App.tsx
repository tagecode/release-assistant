import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout";
import { NavItem } from "@/components/sidebar";
import { LayoutDashboard, Users, Settings, Home, ChevronRight } from "lucide-react";
import { HomePage } from "@/pages/home";
import { DashboardPage } from "@/pages/dashboard";
import { UsersPage } from "@/pages/users";
import { SettingsPage } from "@/pages/settings";

// 定义导航菜单结构
const navItems: NavItem[] = [
  {
    title: "首页",
    path: "/",
    icon: <Home className="h-4 w-4" />,
  },
  {
    title: "管理",
    icon: <ChevronRight className="h-4 w-4" />,
    children: [
      {
        title: "仪表盘",
        path: "/dashboard",
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
      {
        title: "用户管理",
        path: "/users",
        icon: <Users className="h-4 w-4" />,
      },
    ],
  },
  {
    title: "设置",
    path: "/settings",
    icon: <Settings className="h-4 w-4" />,
  },
];

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout navItems={navItems} />}>
          <Route index element={<HomePage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
