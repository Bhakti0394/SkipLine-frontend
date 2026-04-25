import { useState, useEffect } from 'react';
import { User, LogOut, Activity, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import '../styles/Userprofiledropdown.scss';

interface UserProfile {
  name: string;
  email: string;
  role: string;
  initials: string;
}

interface ActivityLogItem {
  id: string;
  type: 'order' | 'stock' | 'shift';
  title: string;
  description: string;
  timestamp: string;
  icon: 'check' | 'warning' | 'info';
}

interface UserProfileDropdownProps {
  user: UserProfile;
  onLogout: () => void;
  onProfileUpdate?: (user: UserProfile) => void;
}

export function UserProfileDropdown({ 
  user, 
  onLogout,
  onProfileUpdate 
}: UserProfileDropdownProps) {
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [activityLogOpen, setActivityLogOpen] = useState(false);
  const [editedUser, setEditedUser] = useState(user);

// Only sync when dialog is closed — prevents mid-edit reset
  // when parent re-renders with updated user prop
  useEffect(() => {
    if (!editProfileOpen) {
      setEditedUser(user);
    }
  }, [user, editProfileOpen]);

  // Mock activity data
  const activityLog: ActivityLogItem[] = [
    {
      id: '1',
      type: 'order',
      title: 'Order Completed',
      description: 'Order #2863 marked as completed',
      timestamp: '5 mins ago',
      icon: 'check'
    },
    {
      id: '2',
      type: 'stock',
      title: 'Low Stock',
      description: 'Avocado stock below threshold',
      timestamp: '20 mins ago',
      icon: 'warning'
    },
    {
      id: '3',
      type: 'shift',
      title: 'Shift Started',
      description: 'Morning shift started',
      timestamp: '1 hour ago',
      icon: 'info'
    }
  ];

  const handleSaveProfile = () => {
    if (onProfileUpdate) {
      onProfileUpdate(editedUser);
    }
    setEditProfileOpen(false);
  };

  const getActivityIcon = (type: ActivityLogItem['icon']) => {
    switch (type) {
      case 'check':
        return '✓';
      case 'warning':
        return '!';
      case 'info':
        return 'ℹ';
      default:
        return '•';
    }
  };

  const getActivityClass = (type: ActivityLogItem['type']) => {
    switch (type) {
      case 'order':
        return 'user-profile__activity-item--order';
      case 'stock':
        return 'user-profile__activity-item--stock';
      case 'shift':
        return 'user-profile__activity-item--shift';
      default:
        return '';
    }
  };

  return (
    <div className="user-profile">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="user-profile__trigger">
            <div className="user-profile__avatar">
              <span className="user-profile__initials">{user.initials}</span>
            </div>
          </button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent className="user-profile__dropdown" align="end">
          <div className="user-profile__header">
            <div className="user-profile__avatar user-profile__avatar--large">
              <span className="user-profile__initials user-profile__initials--large">
                {user.initials}
              </span>
            </div>
            <div className="user-profile__info">
              <h3 className="user-profile__name">{user.name}</h3>
              <p className="user-profile__role">{user.role}</p>
              <p className="user-profile__email">{user.email}</p>
            </div>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem 
            className="user-profile__menu-item"
            onClick={() => setEditProfileOpen(true)}
          >
            <User className="user-profile__menu-icon" />
            Edit Profile
          </DropdownMenuItem>

          <DropdownMenuItem 
            className="user-profile__menu-item"
            onClick={() => setActivityLogOpen(true)}
          >
            <Activity className="user-profile__menu-icon" />
            View Activity
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem 
            className="user-profile__menu-item user-profile__menu-item--logout"
            onClick={onLogout}
          >
            <LogOut className="user-profile__menu-icon" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Profile Dialog */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="user-profile__dialog" hideCloseButton>
          <div className="user-profile__dialog-header">
            <DialogTitle className="user-profile__dialog-title">
              Edit Profile
            </DialogTitle>
            <button
              className="user-profile__dialog-close"
              onClick={() => setEditProfileOpen(false)}
              aria-label="Close dialog"
            >
              <X className="user-profile__close-icon" />
            </button>
          </div>
          
          <div className="user-profile__form">
            <div className="user-profile__form-group">
              <label className="user-profile__label">Name</label>
              <Input
                value={editedUser.name}
                onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
                className="user-profile__input"
              />
            </div>

            <div className="user-profile__form-group">
              <label className="user-profile__label">Email</label>
              <Input
                value={editedUser.email}
                onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                className="user-profile__input"
                type="email"
              />
            </div>

            <div className="user-profile__form-group">
              <label className="user-profile__label">Role</label>
              <Input
                value={editedUser.role}
                onChange={(e) => setEditedUser({ ...editedUser, role: e.target.value })}
                className="user-profile__input"
              />
            </div>

            <div className="user-profile__form-actions">
              <Button
                variant="outline"
                onClick={() => setEditProfileOpen(false)}
                className="user-profile__button user-profile__button--cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveProfile}
                className="user-profile__button user-profile__button--save"
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Activity Log Dialog */}
      <Dialog open={activityLogOpen} onOpenChange={setActivityLogOpen}>
        <DialogContent className="user-profile__dialog" hideCloseButton>
          <div className="user-profile__dialog-header">
            <DialogTitle className="user-profile__dialog-title">
              Activity Log
            </DialogTitle>
            <button
              className="user-profile__dialog-close"
              onClick={() => setActivityLogOpen(false)}
              aria-label="Close dialog"
            >
              <X className="user-profile__close-icon" />
            </button>
          </div>
          
          <div className="user-profile__activity-list">
            {activityLog.map((activity) => (
              <div 
                key={activity.id} 
                className={`user-profile__activity-item ${getActivityClass(activity.type)}`}
              >
                <div className="user-profile__activity-icon">
                  {getActivityIcon(activity.icon)}
                </div>
                <div className="user-profile__activity-content">
                  <h4 className="user-profile__activity-title">{activity.title}</h4>
                  <p className="user-profile__activity-description">{activity.description}</p>
                  <span className="user-profile__activity-timestamp">{activity.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}