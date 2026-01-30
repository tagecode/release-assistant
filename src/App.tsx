import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout";
import { NavItem } from "@/components/sidebar";
import {
  LayoutDashboard,
  Users,
  Settings,
  Home,
  ChevronRight,
  Package,
  FileSearch,
  Image,
  Ruler,
  Radius,
  Smartphone,
  Key,
  Lock
} from "lucide-react";
import { HomePage } from "@/pages/home";
import { DashboardPage } from "@/pages/dashboard";
import { UsersPage } from "@/pages/users";
import { SettingsPage } from "@/pages/settings";
import { PackageInfoPage } from "@/pages/package-info";
import { PackageParsePage } from "@/pages/package-parse";
import { IconProcessPage } from "@/pages/icon-process";
import { ImageProcessPage } from "@/pages/image-process";
import { ImageRadiusPage } from "@/pages/image-radius";
import { IconGeneratorPage } from "@/pages/icon-generator";
import { UuidGeneratorPage } from "@/pages/uuid-generator";
import { PasswordGeneratorPage } from "@/pages/password-generator";

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
        title: "UUID 生成器",
        path: "/uuid-generator",
        icon: <Key className="h-4 w-4" />,
      },
      {
        title: "密码生成器",
        path: "/password-generator",
        icon: <Lock className="h-4 w-4" />,
      },
    ],
  },
  {
    title: "APP图片处理",
    icon: <Image className="h-4 w-4" />,
    children: [
      {
        title: "图片尺寸",
        path: "/image-process",
        icon: <Ruler className="h-4 w-4" />,
      },
      {
        title: "图片圆角",
        path: "/image-radius",
        icon: <Radius className="h-4 w-4" />,
      },
      {
        title: "APP图标生成器",
        path: "/icon-generator",
        icon: <Smartphone className="h-4 w-4" />,
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
          <Route path="uuid-generator" element={<UuidGeneratorPage />} />
          <Route path="password-generator" element={<PasswordGeneratorPage />} />
          <Route path="image-process" element={<ImageProcessPage />} />
          <Route path="icon-process" element={<IconProcessPage />} />
          <Route path="image-radius" element={<ImageRadiusPage />} />
          <Route path="icon-generator" element={<IconGeneratorPage />} />
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
