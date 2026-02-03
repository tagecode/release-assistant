import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
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
  Lock,
  ShieldCheck,
  Loader2
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
import { ApkSignaturePage } from "@/pages/apk-signature";
import { LoginPage } from "@/pages/login";
import { RegisterPage } from "@/pages/register";

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
        title: "APK 签名校验",
        path: "/apk-signature",
        icon: <ShieldCheck className="h-4 w-4" />,
        requiresAuth: true, // 需要登录
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
    requiresAuth: true, // 需要登录
    children: [
      {
        title: "仪表盘",
        path: "/dashboard",
        icon: <LayoutDashboard className="h-4 w-4" />,
        requiresAuth: true,
      },
      {
        title: "用户管理",
        path: "/users",
        icon: <Users className="h-4 w-4" />,
        requiresAuth: true,
      },
    ],
  },
  {
    title: "设置",
    path: "/settings",
    icon: <Settings className="h-4 w-4" />,
    requiresAuth: true, // 需要登录
  },
];

// 定义需要认证的路由
const protectedRoutes = new Set([
  "/apk-signature",
  "/dashboard",
  "/users",
  "/settings",
]);

// 路由守卫组件 - 支持条件性认证检查
function ConditionalRoute({
  children,
  requiresAuth = false
}: {
  children: React.ReactNode;
  requiresAuth?: boolean;
}) {
  const { isAuthenticated, loading } = useAuth();

  // 如果需要认证但未登录，重定向到登录页
  if (requiresAuth && !isAuthenticated && !loading) {
    return <Navigate to="/login" replace />;
  }

  // 显示加载状态
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// 公开路由（登录/注册页面）- 已登录用户不可访问
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* 公开路由 - 登录/注册 */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />

      {/* 主应用路由 - 所有路由都在 Layout 内 */}
      <Route path="/" element={<Layout navItems={navItems} />}>
        <Route index element={<ConditionalRoute><HomePage /></ConditionalRoute>} />
        <Route
          path="package-info"
          element={<ConditionalRoute><PackageInfoPage /></ConditionalRoute>}
        />
        <Route
          path="package-parse"
          element={<ConditionalRoute><PackageParsePage /></ConditionalRoute>}
        />
        <Route
          path="apk-signature"
          element={
            <ConditionalRoute requiresAuth={true}>
              <ApkSignaturePage />
            </ConditionalRoute>
          }
        />
        <Route
          path="uuid-generator"
          element={<ConditionalRoute><UuidGeneratorPage /></ConditionalRoute>}
        />
        <Route
          path="password-generator"
          element={<ConditionalRoute><PasswordGeneratorPage /></ConditionalRoute>}
        />
        <Route
          path="image-process"
          element={<ConditionalRoute><ImageProcessPage /></ConditionalRoute>}
        />
        <Route
          path="icon-process"
          element={<ConditionalRoute><IconProcessPage /></ConditionalRoute>}
        />
        <Route
          path="image-radius"
          element={<ConditionalRoute><ImageRadiusPage /></ConditionalRoute>}
        />
        <Route
          path="icon-generator"
          element={<ConditionalRoute><IconGeneratorPage /></ConditionalRoute>}
        />
        <Route
          path="dashboard"
          element={
            <ConditionalRoute requiresAuth={true}>
              <DashboardPage />
            </ConditionalRoute>
          }
        />
        <Route
          path="users"
          element={
            <ConditionalRoute requiresAuth={true}>
              <UsersPage />
            </ConditionalRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ConditionalRoute requiresAuth={true}>
              <SettingsPage />
            </ConditionalRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
