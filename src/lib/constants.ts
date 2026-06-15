export const APP_NAME = 'School Attendance Portal';
export const APP_DESCRIPTION = 'Manage attendance efficiently';

export const CLASSES = [
  { name: 'Class 1', sections: ['A', 'B', 'C'] },
  { name: 'Class 2', sections: ['A', 'B', 'C'] },
  { name: 'Class 3', sections: ['A', 'B', 'C'] },
  { name: 'Class 4', sections: ['A', 'B', 'C'] },
  { name: 'Class 5', sections: ['A', 'B', 'C'] },
  { name: 'Class 6', sections: ['A', 'B', 'C'] },
  { name: 'Class 7', sections: ['A', 'B', 'C'] },
  { name: 'Class 8', sections: ['A', 'B', 'C'] },
  { name: 'Class 9', sections: ['A', 'B'] },
  { name: 'Class 10', sections: ['A', 'B'] },
];

export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Students', href: '/dashboard/students', icon: 'Users' },
  { label: 'Attendance', href: '/dashboard/attendance', icon: 'ClipboardCheck' },
  { label: 'Reports', href: '/dashboard/reports', icon: 'BarChart3' },
  { label: 'Notifications', href: '/dashboard/notifications', icon: 'Bell' },
  { label: 'Settings', href: '/dashboard/settings', icon: 'Settings' },
] as const;

export const ITEMS_PER_PAGE = 10;
