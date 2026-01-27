import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavLink, useLocation } from "react-router-dom";

export interface NavItem {
  title: string;
  path?: string;
  icon?: React.ReactNode;
  children?: NavItem[];
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
        {item.title}
      </NavLink>
    </li>
  );
}

export function Sidebar({ navItems, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-screen w-64 flex-col border-r bg-background",
        className
      )}
    >
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-lg font-semibold">Tauri App</h1>
      </div>
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {navItems.map((item, index) => (
            <SidebarMenuItem key={index} item={item} />
          ))}
        </ul>
      </nav>
    </aside>
  );
}
