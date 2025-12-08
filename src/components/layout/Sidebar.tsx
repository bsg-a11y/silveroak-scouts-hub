import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Megaphone, 
  ClipboardList,
  PackageSearch,
  FileText,
  Award,
  UserCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  LogOut,
  CalendarDays,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
}

const mainNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Users, label: 'Members', path: '/members', adminOnly: true },
  { icon: Calendar, label: 'Activities', path: '/activities' },
  { icon: Megaphone, label: 'Announcements', path: '/announcements' },
  { icon: CalendarDays, label: 'Meetings', path: '/meetings' },
  { icon: ClipboardList, label: 'Attendance', path: '/attendance', adminOnly: true },
  { icon: FileText, label: 'Leave Requests', path: '/leaves' },
  { icon: PackageSearch, label: 'Inventory', path: '/inventory', adminOnly: true },
  { icon: Award, label: 'Certificates', path: '/certificates' },
];

const bottomNavItems = [
  { icon: Bell, label: 'Notifications', path: '/notifications' },
  { icon: UserCircle, label: 'Profile', path: '/profile' },
  { icon: Settings, label: 'Settings', path: '/settings', adminOnly: true },
];

export function Sidebar({ collapsed, onToggle, isMobile }: SidebarProps) {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="h-full bg-sidebar flex flex-col border-r border-sidebar-border">
      {/* Logo Area */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <span className="text-sidebar-primary-foreground font-bold text-lg">BSG</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sidebar-foreground font-semibold text-sm leading-tight">
                Bharat Scouts
              </span>
              <span className="text-sidebar-foreground/60 text-xs">
                Silver Oak University
              </span>
            </div>
          </div>
        )}
        
        {collapsed && (
          <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center mx-auto">
            <span className="text-sidebar-primary-foreground font-bold text-lg">B</span>
          </div>
        )}

        {/* Toggle/Close Button */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={onToggle}
        >
          {isMobile ? (
            <X className="h-5 w-5" />
          ) : collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive(item.path)
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", collapsed && "mx-auto")} />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.adminOnly && (
                    <Badge variant="admin" className="text-[10px] px-1.5 py-0">
                      Admin
                    </Badge>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="space-y-1">
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive(item.path)
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", collapsed && "mx-auto")} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}

          {/* Logout Button */}
          <button
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              "text-sidebar-foreground/60 hover:bg-destructive/10 hover:text-destructive"
            )}
          >
            <LogOut className={cn("h-5 w-5 shrink-0", collapsed && "mx-auto")} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
