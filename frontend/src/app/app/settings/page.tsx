'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { formatRole } from '@/lib/terminology';
import {
  User,
  Building2,
  Bell,
  Shield,
  KeyRound,
  CheckCircle2,
  Server,
  Lock,
  Save,
  AlertCircle,
} from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();

  // Active section
  const [activeTab, setActiveTab] = useState<'profile' | 'organization' | 'notifications' | 'security'>('profile');

  // Profile form state
  const [name, setName] = useState(user?.name ?? 'Rajesh Mehta');
  const [phone, setPhone] = useState('+91 98230 12345');
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // Notification toggles
  const [notifications, setNotifications] = useState({
    slaAlerts: true,
    queryUpdates: true,
    inspectionAlerts: true,
    complianceReminders: true,
    emailDigest: false,
    smsAlerts: true,
  });

  // Security password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMessage('Profile information updated successfully.');
    setTimeout(() => setSavedMessage(null), 3000);
  };

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setPasswordStatus({ type: 'error', message: 'Please fill in all password fields.' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordStatus({ type: 'error', message: 'New password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }
    setPasswordStatus({ type: 'success', message: 'Password updated successfully.' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordStatus(null), 3500);
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
    setSavedMessage('Notification preferences updated.');
    setTimeout(() => setSavedMessage(null), 2500);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage your applicant profile, notification preferences, and account security.
        </p>
      </div>

      {savedMessage && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl">
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${
            activeTab === 'profile' ? 'text-primary-800 border-b-2 border-primary-700' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('organization')}
          className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${
            activeTab === 'organization' ? 'text-primary-800 border-b-2 border-primary-700' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Organization</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${
            activeTab === 'notifications' ? 'text-primary-800 border-b-2 border-primary-700' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifications</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${
            activeTab === 'security' ? 'text-primary-800 border-b-2 border-primary-700' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Security & System</span>
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200/80 rounded-xl p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Personal Information</h2>
            
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
              <div className="w-16 h-16 rounded-full bg-primary-700 text-white flex items-center justify-center text-xl font-bold">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-base">{user?.name ?? 'Rajesh Mehta'}</h3>
                <p className="text-xs text-gray-500">{user?.email ?? 'entrepreneur@demo.local'}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    {formatRole(user?.role)}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                    Active Verified Account
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Official Email Address</label>
                  <input
                    type="email"
                    value={user?.email ?? 'entrepreneur@demo.local'}
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 bg-gray-50 text-gray-500 rounded-lg text-sm cursor-not-allowed"
                  />
                  <span className="text-[11px] text-gray-400 mt-1 block">Registered Single-Window login ID</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contact Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Designation</label>
                  <input
                    type="text"
                    defaultValue="Managing Director & Promoter"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-700 text-white rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Organization Tab */}
      {activeTab === 'organization' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200/80 rounded-xl p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Company Profile</h2>
            <p className="text-xs text-gray-500 mb-4">Enterprise details registered on the Single Window Clearance Portal.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-xs text-gray-400 font-medium">Legal Entity Name</span>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">ABC Foods Pvt Ltd</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-xs text-gray-400 font-medium">Corporate Identity Number (CIN)</span>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">U15132MH2021PTC368912</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-xs text-gray-400 font-medium">Registered State & District</span>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">Maharashtra · Pune District</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-xs text-gray-400 font-medium">Industrial Area / Location</span>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">Plot No. 42, MIDC Bhosari, Pune</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-xs text-gray-400 font-medium">Industry Classification</span>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">Manufacturing · Food Processing</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-xs text-gray-400 font-medium">Enterprise Size</span>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">₹25.00 Crore Capital (MSME / Large)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200/80 rounded-xl p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Notification Preferences</h2>
            <p className="text-xs text-gray-500 mb-6">Choose how and when you receive statutory clearance updates.</p>

            <div className="divide-y divide-gray-100">
              <div className="py-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">SLA & Statutory Deadline Alerts</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Get notified 48 hours before an approval SLA or inspection timeline approaches.</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleNotification('slaAlerts')}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    notifications.slaAlerts ? 'bg-primary-700' : 'bg-gray-200'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      notifications.slaAlerts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="py-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Department Clarifications & Queries</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Receive immediate notifications whenever an officer raises an enquiry on your application.</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleNotification('queryUpdates')}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    notifications.queryUpdates ? 'bg-primary-700' : 'bg-gray-200'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      notifications.queryUpdates ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="py-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Joint Site Inspection Schedule</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Alerts when joint or departmental site inspection dates are assigned or updated.</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleNotification('inspectionAlerts')}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    notifications.inspectionAlerts ? 'bg-primary-700' : 'bg-gray-200'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      notifications.inspectionAlerts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="py-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Periodic Compliance & Renewal Reminders</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Receive 30-day and 90-day reminders before consent or license expirations.</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleNotification('complianceReminders')}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    notifications.complianceReminders ? 'bg-primary-700' : 'bg-gray-200'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      notifications.complianceReminders ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="py-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">SMS Notification Channel</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Send critical clearance approval SMS messages to the registered mobile number.</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleNotification('smsAlerts')}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    notifications.smsAlerts ? 'bg-primary-700' : 'bg-gray-200'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      notifications.smsAlerts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security & System Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200/80 rounded-xl p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Change Password</h2>
            <p className="text-xs text-gray-500 mb-4">Ensure your account uses a strong, unique password.</p>

            {passwordStatus && (
              <div
                className={`mb-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
                  passwordStatus.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {passwordStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                )}
                <span>{passwordStatus.message}</span>
              </div>
            )}

            <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-700 text-white rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors shadow-sm"
              >
                <KeyRound className="w-4 h-4" />
                <span>Update Password</span>
              </button>
            </form>
          </div>

          {/* System & Architecture Status */}
          <div className="bg-white border border-gray-200/80 rounded-xl p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-1">System & Integration Status</h2>
            <p className="text-xs text-gray-500 mb-4">Underlying infrastructure connection details.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-3">
                <Server className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-900">Backend API</p>
                  <p className="text-[11px] text-green-600 font-semibold mt-0.5">Online (Port 4000)</p>
                  <p className="text-[11px] text-gray-400 mt-1">REST API + Auth Guard</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-900">Supabase Database</p>
                  <p className="text-[11px] text-green-600 font-semibold mt-0.5">Connected (PostgreSQL)</p>
                  <p className="text-[11px] text-gray-400 mt-1">Cloud Hosted DB · RLS Active</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-3">
                <Lock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-900">Session Security</p>
                  <p className="text-[11px] text-blue-600 font-semibold mt-0.5">JWT Encrypted</p>
                  <p className="text-[11px] text-gray-400 mt-1">Bearer Token Authorization</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
