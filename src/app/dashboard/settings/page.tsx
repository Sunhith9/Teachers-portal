'use client';

import { useState, useEffect } from 'react';
import { User, School, Bell, Shield, Moon, Sun, Monitor, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useTheme } from 'next-themes';
import { useToast } from '@/components/ui/toast';
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LoadingSpinner } from '@/components/ui/loading';

type SettingsTab = 'profile' | 'school' | 'notifications' | 'security';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Form states
  const [profileName, setProfileName] = useState('');
  
  const [schoolDetails, setSchoolDetails] = useState({
    name: 'Greenwood High School',
    code: 'GW-0982',
    principal: 'Dr. Rajesh Kumar',
    email: 'contact@greenwoodhigh.edu',
    phone: '+91 9876543210',
    address: '123 Academic Avenue, Knowledge City',
  });

  const [notificationPrefs, setNotificationPrefs] = useState({
    enableWhatsApp: true,
    enableEmail: false,
    autoSendAlerts: true,
  });

  const [securityData, setSecurityData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  // Load profile from Supabase
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    }
  });

  // Set profile local state when loaded
  useEffect(() => {
    if (profile) {
      setProfileName(profile.full_name || '');
    }
  }, [profile]);

  // Load School Details & Notification Prefs from localStorage
  useEffect(() => {
    const cachedSchool = localStorage.getItem('school_settings');
    if (cachedSchool) {
      try {
        setSchoolDetails(JSON.parse(cachedSchool));
      } catch (e) {
        console.error('Failed to parse school settings', e);
      }
    }

    const cachedNotifs = localStorage.getItem('notification_settings');
    if (cachedNotifs) {
      try {
        setNotificationPrefs(JSON.parse(cachedNotifs));
      } catch (e) {
        console.error('Failed to parse notification settings', e);
      }
    }
  }, []);

  // Profile Update Mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (newName: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: newName })
        .eq('id', user.id);
      if (error) throw error;
      return newName;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      showToast('Profile updated successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to update profile', 'error');
    }
  });

  // Password Update Mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
    onSuccess: () => {
      setSecurityData({ newPassword: '', confirmPassword: '' });
      showToast('Password updated successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to update password', 'error');
    }
  });

  const handleSave = () => {
    if (activeTab === 'profile') {
      if (!profileName.trim()) {
        showToast('Name cannot be empty', 'warning');
        return;
      }
      updateProfileMutation.mutate(profileName);
    } else if (activeTab === 'school') {
      localStorage.setItem('school_settings', JSON.stringify(schoolDetails));
      showToast('School details saved successfully', 'success');
    } else if (activeTab === 'notifications') {
      localStorage.setItem('notification_settings', JSON.stringify(notificationPrefs));
      showToast('Notification preferences saved successfully', 'success');
    } else if (activeTab === 'security') {
      if (!securityData.newPassword) {
        showToast('Please enter a new password', 'warning');
        return;
      }
      if (securityData.newPassword.length < 6) {
        showToast('Password must be at least 6 characters long', 'warning');
        return;
      }
      if (securityData.newPassword !== securityData.confirmPassword) {
        showToast('Passwords do not match', 'warning');
        return;
      }
      updatePasswordMutation.mutate(securityData.newPassword);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-heading">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your account and portal preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Settings Navigation */}
        <div className="md:col-span-1 space-y-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-3 w-full p-3 rounded-xl font-medium transition-colors ${
              activeTab === 'profile'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
            }`}
          >
            <User className="h-5 w-5" />
            Profile Info
          </button>
          <button
            onClick={() => setActiveTab('school')}
            className={`flex items-center gap-3 w-full p-3 rounded-xl font-medium transition-colors ${
              activeTab === 'school'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
            }`}
          >
            <School className="h-5 w-5" />
            School Details
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-3 w-full p-3 rounded-xl font-medium transition-colors ${
              activeTab === 'notifications'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
            }`}
          >
            <Bell className="h-5 w-5" />
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-3 w-full p-3 rounded-xl font-medium transition-colors ${
              activeTab === 'security'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
            }`}
          >
            <Shield className="h-5 w-5" />
            Security & Auth
          </button>
        </div>

        {/* Settings Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Tab 1: Profile */}
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingProfile ? (
                  <div className="py-10 flex items-center justify-center">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="h-20 w-20 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-2xl font-bold dark:bg-blue-900/30 dark:text-blue-400">
                        {profileName ? getInitials(profileName) : 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{profile?.email || 'admin@school.edu'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">Role: {profile?.role || 'teacher'}</p>
                      </div>
                    </div>

                    <Input
                      label="Full Name"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                    />
                    <Input
                      label="Email Address"
                      value={profile?.email || ''}
                      disabled
                    />
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tab 2: School Details */}
          {activeTab === 'school' && (
            <Card>
              <CardHeader>
                <CardTitle>School Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="School Name"
                    value={schoolDetails.name}
                    onChange={(e) => setSchoolDetails({ ...schoolDetails, name: e.target.value })}
                  />
                  <Input
                    label="School Code"
                    value={schoolDetails.code}
                    onChange={(e) => setSchoolDetails({ ...schoolDetails, code: e.target.value })}
                  />
                  <Input
                    label="Principal Name"
                    value={schoolDetails.principal}
                    onChange={(e) => setSchoolDetails({ ...schoolDetails, principal: e.target.value })}
                  />
                  <Input
                    label="School Email"
                    type="email"
                    value={schoolDetails.email}
                    onChange={(e) => setSchoolDetails({ ...schoolDetails, email: e.target.value })}
                  />
                  <Input
                    label="School Phone"
                    value={schoolDetails.phone}
                    onChange={(e) => setSchoolDetails({ ...schoolDetails, phone: e.target.value })}
                  />
                </div>
                <Input
                  label="Address"
                  value={schoolDetails.address}
                  onChange={(e) => setSchoolDetails({ ...schoolDetails, address: e.target.value })}
                />
              </CardContent>
            </Card>
          )}

          {/* Tab 3: Notifications */}
          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.enableWhatsApp}
                      onChange={(e) => setNotificationPrefs({ ...notificationPrefs, enableWhatsApp: e.target.checked })}
                      className="mt-1 h-4 w-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">WhatsApp Alerts</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Send automatic absence alerts via Meta WhatsApp Cloud API</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.enableEmail}
                      onChange={(e) => setNotificationPrefs({ ...notificationPrefs, enableEmail: e.target.checked })}
                      className="mt-1 h-4 w-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Email Notifications</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Receive copy of daily attendance and summary reports via email</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.autoSendAlerts}
                      onChange={(e) => setNotificationPrefs({ ...notificationPrefs, autoSendAlerts: e.target.checked })}
                      className="mt-1 h-4 w-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Auto-send WhatsApp alerts</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Default the &quot;Send WhatsApp alerts immediately&quot; checkbox to true when marking attendance</p>
                    </div>
                  </label>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tab 4: Security */}
          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="New Password"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={securityData.newPassword}
                  onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })}
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="Re-enter password"
                  value={securityData.confirmPassword}
                  onChange={(e) => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
                />
              </CardContent>
            </Card>
          )}

          {/* Theme card is visible in all tabs as general preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setTheme('light')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${theme === 'light' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'}`}
                >
                  <Sun className="h-6 w-6 text-amber-500" />
                  <span className="text-sm font-medium">Light</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${theme === 'dark' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'}`}
                >
                  <Moon className="h-6 w-6 text-slate-700 dark:text-slate-300" />
                  <span className="text-sm font-medium">Dark</span>
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${theme === 'system' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'}`}
                >
                  <Monitor className="h-6 w-6 text-gray-500" />
                  <span className="text-sm font-medium">System</span>
                </button>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button
              onClick={handleSave}
              loading={updateProfileMutation.isPending || updatePasswordMutation.isPending}
            >
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
