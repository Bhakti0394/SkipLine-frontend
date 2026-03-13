import { useState } from 'react';
import { Search, LayoutGrid, List, BarChart3, Package, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LiveClock } from './LiveClock';
import { NotificationsDropdown, Notification } from './NotificationsDropdown';
import { UserProfileDropdown } from './Userprofiledropdown';
import { KitchenSettings } from '../../../kitchen-types/settings';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import '../styles/Header.scss';

type ViewMode = 'kanban' | 'list' | 'analytics' | 'inventory';

interface HeaderProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  pendingCount: number;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  onClearAllNotifications: () => void;
  settings: KitchenSettings;
  onSettingsChange: (settings: KitchenSettings) => void;
  onLogout?: () => void;
  onProfileUpdate?: (user: { name: string; email: string; role: string; initials: string }) => void;
}

const sheetStyles: React.CSSProperties = {
  background: [
    'radial-gradient(ellipse 90% 30% at 50% 0%, rgba(249,115,22,0.22) 0%, transparent 70%)',
    'linear-gradient(180deg, #131210 0%, #0e0d0c 35%, #0a0909 100%)',
  ].join(', '),
  backgroundColor: '#0e0d0c',
  borderRight: '1px solid rgba(249, 115, 22, 0.15)',
  borderLeft: 'none',
  borderTop: 'none',
  borderBottom: 'none',
  boxShadow: '6px 0 60px rgba(0,0,0,0.95), 0 0 100px rgba(249,115,22,0.05)',
  color: '#f1f5f9',
  width: '300px',
  maxWidth: '85vw',
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
};

export function Header({
  viewMode,
  setViewMode,
  pendingCount,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onClearAllNotifications,
  settings,
  onSettingsChange,
  onLogout = () => console.log('Logout'),
  onProfileUpdate,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userProfile = {
    name: 'Jordan Davis',
    email: 'jordan.davis@SkipLine.com',
    role: 'Kitchen Manager',
    initials: 'JD',
  };

  const views: { mode: ViewMode; icon: React.ElementType; label: string }[] = [
    { mode: 'kanban',    icon: LayoutGrid, label: 'Kanban'    },
    { mode: 'list',      icon: List,       label: 'List'      },
    { mode: 'analytics', icon: BarChart3,  label: 'Analytics' },
    { mode: 'inventory', icon: Package,    label: 'Inventory' },
  ];

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    setMobileMenuOpen(false);
  };

  return (
    <header className="header">
      <div className="header__container">

        {/* ── Left ── */}
        <div className="header__left">

          {/* Mobile hamburger */}
          <div className="header__mobile-menu-wrapper">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="header__mobile-menu-btn">
                  <Menu className="header__icon" />
                </Button>
              </SheetTrigger>

              <SheetContent side="left" className="header__mobile-sheet" style={sheetStyles}>

                {/* Top orange glow line */}
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0,
                  height: '1px',
                  background: 'linear-gradient(90deg, transparent 0%, rgba(249,115,22,0.6) 40%, rgba(251,146,60,0.8) 60%, transparent 100%)',
                  pointerEvents: 'none',
                }} />

                <SheetHeader>
                  <SheetTitle
                    className="header__mobile-sheet-title"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'transparent' }}
                  >
                    <div className="header__logo-icon header__logo-icon--mobile">
                      <span className="header__logo-text">S</span>
                    </div>
                    <div className="header__mobile-brand">
                      <span className="header__brand-name">SkipLine</span>
                      <span className="header__brand-subtitle">Kitchen Control</span>
                    </div>
                  </SheetTitle>
                </SheetHeader>

                {/* Mobile search */}
                <div
                  className="header__mobile-search-wrapper"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="header__search-container">
                    <Search className="header__search-icon" />
                    <Input
                      placeholder="Search orders..."
                      className="header__search-input"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(249,115,22,0.2)',
                        color: '#f1f5f9',
                      }}
                    />
                  </div>
                </div>

                {/* Mobile nav */}
                <div className="header__mobile-nav">
                  {/* ✅ Fixed: was header__mobile-nav-label — same name as btn text, causing style bleed */}
                  <div className="header__mobile-nav-heading">Navigation</div>

                  {views.map(({ mode, icon: Icon, label }) => (
                    <Button
                      key={mode}
                      variant="ghost"
                      className={`header__mobile-nav-btn ${
                        viewMode === mode ? 'header__mobile-nav-btn--active' : ''
                      }`}
                      onClick={() => handleViewChange(mode)}
                      style={viewMode === mode ? {
                        background: 'linear-gradient(90deg, rgba(249,115,22,0.15) 0%, rgba(249,115,22,0.04) 100%)',
                        border: '1px solid rgba(249,115,22,0.2)',
                        color: '#fb923c',
                        borderRadius: '0.75rem',
                      } : {
                        color: '#94a3b8',
                        border: '1px solid transparent',
                      }}
                    >
                      <div
                        className="header__mobile-nav-icon-wrapper"
                        style={viewMode === mode ? {
                          background: 'rgba(249,115,22,0.18)',
                          boxShadow: '0 0 16px rgba(249,115,22,0.35)',
                          border: '1px solid rgba(249,115,22,0.3)',
                        } : {
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <Icon className="header__mobile-nav-icon" />
                      </div>

                      {/* ✅ Fixed: was header__mobile-nav-label — renamed to header__mobile-nav-text */}
                      <span className="header__mobile-nav-text">{label}</span>

                      {viewMode === mode && (
                        <div className="header__mobile-nav-indicator" />
                      )}
                    </Button>
                  ))}
                </div>

                {/* Mobile user */}
                <div
                  className="header__mobile-user-section"
                  style={{
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    background: 'linear-gradient(180deg, transparent, rgba(249,115,22,0.04))',
                  }}
                >
                  <div
                    className="header__mobile-user-info"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '0.75rem',
                    }}
                  >
                    <div className="header__mobile-user-avatar">
                      {userProfile.initials}
                    </div>
                    <div className="header__mobile-user-details">
                      <div className="header__mobile-user-name">{userProfile.name}</div>
                      <div className="header__mobile-user-role">{userProfile.role}</div>
                    </div>
                  </div>
                </div>

              </SheetContent>
            </Sheet>
          </div>

          {/* Logo */}
          <div className="header__logo">
            <div className="header__logo-icon header__logo-icon--glow">
              <span className="header__logo-text">S</span>
            </div>
            <div className="header__brand">
              <h1 className="header__brand-name">SkipLine</h1>
              <p className="header__brand-subtitle">Kitchen Control</p>
            </div>
          </div>

          {/* Desktop view switcher */}
          <div className="header__view-switcher">
            {views.map(({ mode, icon: Icon, label }) => (
              <Button
                key={mode}
                variant="ghost"
                size="sm"
                className={`header__view-btn ${viewMode === mode ? 'header__view-btn--active' : ''}`}
                onClick={() => setViewMode(mode)}
              >
                <Icon className="header__view-icon" />
                <span className="header__view-label">{label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* ── Right ── */}
        <div className="header__right">
          <div className="header__clock">
            <LiveClock />
          </div>

          <div className="header__actions">
            {/* Desktop search */}
            <div className="header__desktop-search">
              <div className="header__search-container">
                <Search className="header__search-icon" />
                <Input
                  placeholder="Search orders..."
                  className="header__search-input header__search-input--desktop"
                />
              </div>
            </div>

            {/* Notifications */}
            <div className="header__notifications">
              <NotificationsDropdown
                notifications={notifications}
                onMarkAsRead={onMarkAsRead}
                onMarkAllAsRead={onMarkAllAsRead}
                onDelete={onDeleteNotification}
                onClearAll={onClearAllNotifications}
              />
            </div>

            {/* User */}
            <div className="header__user header__user--mobile-visible">
              <UserProfileDropdown
                user={userProfile}
                onLogout={onLogout}
                onProfileUpdate={onProfileUpdate}
              />
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}

