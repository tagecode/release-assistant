import { useState } from "react";
import { ChevronDown, ChevronRight, LogOut, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface NavItem {
  title: string;
  path?: string;
  icon?: React.ReactNode;
  children?: NavItem[];
  requiresAuth?: boolean; // 是否需要登录才能访问
}

interface SidebarProps {
  navItems: NavItem[];
  className?: string;
}

interface SidebarMenuItemProps {
  item: NavItem;
  level?: number;
}

function SidebarMenuItem({ item, level = 0 }: SidebarMenuItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  // Check if any child is active
  const hasActiveChild = hasChildren
    ? item.children!.some((child) => child.path === location.pathname)
    : false;

  // Auto-expand if a child is active
  if (hasActiveChild && !isExpanded) {
    setIsExpanded(true);
  }

  if (hasChildren) {
    return (
      <li>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
            level > 0 && "ml-4"
          )}
        >
          {item.icon}
          <span className="flex-1 text-left">{item.title}</span>
          {item.requiresAuth && !isAuthenticated && (
            <span className="ml-auto text-xs rounded bg-primary/10 px-1.5 py-0.5 text-primary">
              需登录
            </span>
          )}
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        {isExpanded && (
          <ul className="mt-1 space-y-1">
            {item.children!.map((child, index) => (
              <SidebarMenuItem
                key={index}
                item={child}
                level={level + 1}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <NavLink
        to={item.path!}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
            level > 0 && "ml-4",
            isActive && "bg-accent text-accent-foreground"
          )
        }
      >
        {item.icon}
        <span className="flex-1">{item.title}</span>
        {item.requiresAuth && !isAuthenticated && (
          <span className="text-xs rounded bg-primary/10 px-1.5 py-0.5 text-primary">
            需登录
          </span>
        )}
      </NavLink>
    </li>
  );
}

export function Sidebar({ navItems, className }: SidebarProps) {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleLogin = () => {
    navigate("/login");
  };

  return (
    <aside
      className={cn(
        "flex h-screen w-64 flex-col border-r bg-background",
        className
      )}
    >
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-lg font-semibold">应用发布助手</h1>
      </div>
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {navItems.map((item, index) => (
            <SidebarMenuItem key={index} item={item} />
          ))}
        </ul>
      </nav>

      {/* 底部区域：登录按钮或用户信息 */}
      <div className="border-t p-4">
        {isAuthenticated && user ? (
          // 已登录 - 显示用户信息
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 px-3"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-1 flex-col items-start text-sm">
                  <span className="font-medium">{user.username}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user.username}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          // 未登录 - 显示登录按钮
          <Button
            onClick={handleLogin}
            className="w-full"
            variant="default"
          >
            <UserIcon className="mr-2 h-4 w-4" />
            登录账户
          </Button>
        )}
      </div>
    </aside>
  );
}
