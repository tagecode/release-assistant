import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout";
import { NavItem } from "@/components/sidebar";
import { LayoutDashboard, Users, Settings, Home, ChevronRight, Package, FileSearch, Image } from "lucide-react";
import { HomePage } from "@/pages/home";
import { DashboardPage } from "@/pages/dashboard";
import { UsersPage } from "@/pages/users";
import { SettingsPage } from "@/pages/settings";
import { PackageInfoPage } from "@/pages/package-info";
import { PackageParsePage } from "@/pages/package-parse";
import { IconProcessPage } from "@/pages/icon-process";

// 定义导航菜单结构
const navItems: NavItem[] = [
  {
    title: "首页",
    path: "/",
    icon: <Home className="h-4 w-4" />,
  },
  {
    title: "通用处理",
    icon: <Package className="h-4 w-4" />,
    children: [
      {
        title: "文件信息",
        path: "/package-info",
        icon: <Package className="h-4 w-4" />,
      },
      {
        title: "包解析（Android）",
        path: "/package-parse",
        icon: <FileSearch className="h-4 w-4" />,
      },
      {
        title: "APP图标处理",
        path: "/icon-process",
        icon: <Image className="h-4 w-4" />,
      },
    ],
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
          <Route path="package-info" element={<PackageInfoPage />} />
          <Route path="package-parse" element={<PackageParsePage />} />
          <Route path="icon-process" element={<IconProcessPage />} />
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
