import { useNavigate } from 'react-router-dom';
import { Menu, Bell, Search, User, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SecureAvatar } from '@/components/SecureAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LABELS, type UserRole } from '@/types';

interface HeaderProps {
  onMenuClick: () => void;
  sidebarOpen: boolean;
}

export function Header({ onMenuClick, sidebarOpen }: HeaderProps) {
  const navigate = useNavigate();
  const { profile, roles, signOut, isLoading } = useAuth();

  const fullName = profile 
    ? `${profile.first_name} ${profile.last_name}`.trim()
    : 'Loading...';
  
  const initials = profile
    ? `${profile.first_name[0]}${profile.last_name[0]}`
    : '?';

  const userRole = (roles[0] || 'member') as UserRole;

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // Mock notifications - will be replaced with real data
  const notifications = [
    { id: 1, title: 'New activity registered', time: '5 min ago', unread: true },
    { id: 2, title: 'Leave request approved', time: '1 hour ago', unread: true },
    { id: 3, title: 'Meeting scheduled', time: '2 hours ago', unread: false },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 lg:px-8">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search */}
        <div className="hidden md:flex items-center relative">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members, activities..."
            className="w-64 lg:w-80 pl-9 bg-muted/50 border-muted focus:bg-background"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Mobile Search */}
        <Button variant="ghost" size="icon" className="md:hidden">
          <Search className="h-5 w-5" />
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              <Badge variant="info">{unreadCount} new</Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.map((notification) => (
              <DropdownMenuItem key={notification.id} className="flex flex-col items-start gap-1 py-3">
                <div className="flex items-center gap-2 w-full">
                  {notification.unread && (
                    <span className="w-2 h-2 rounded-full bg-primary" />
                  )}
                  <span className={notification.unread ? 'font-medium' : 'text-muted-foreground'}>
                    {notification.title}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground pl-4">
                  {notification.time}
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="justify-center text-primary font-medium cursor-pointer"
              onClick={() => navigate('/notifications')}
            >
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-3 px-2">
              <SecureAvatar
                src={profile?.profile_photo_url || null}
                fallback={initials}
                className="h-8 w-8"
                fallbackClassName="bg-primary text-primary-foreground text-sm"
              />
              <div className="hidden lg:flex flex-col items-start">
                <span className="text-sm font-medium">{fullName}</span>
                <span className="text-xs text-muted-foreground">{profile?.uid || 'Loading...'}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{fullName}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {profile?.uid} • {ROLE_LABELS[userRole]}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
              <User className="h-4 w-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
