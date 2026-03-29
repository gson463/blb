import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppShell from '@/components/AppShell.jsx';
import { UserCircle, Mail, Building2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

const LandlordProfilePage = () => {
  const { currentUser, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profile, setProfile] = useState({ name: '', company_name: '' });
  const [passwords, setPasswords] = useState({
    oldPassword: '',
    password: '',
    passwordConfirm: '',
  });

  useEffect(() => {
    if (currentUser) {
      setProfile({
        name: currentUser.name || '',
        company_name: currentUser.company_name || '',
      });
    }
  }, [currentUser]);

  const submitProfile = async (e) => {
    e.preventDefault();
    if (!currentUser?.id) return;
    setProfileLoading(true);
    try {
      await pb.collection('users').update(
        currentUser.id,
        {
          name: profile.name.trim(),
          company_name: profile.company_name.trim() || '',
        },
        { $autoCancel: false }
      );
      await refreshUser();
      toast.success('Profile updated.');
    } catch (error) {
      toast.error(error?.message || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
  };

  const submitPasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.password !== passwords.passwordConfirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwords.password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      await pb.collection('users').update(
        currentUser.id,
        {
          oldPassword: passwords.oldPassword,
          password: passwords.password,
          passwordConfirm: passwords.passwordConfirm,
        },
        { $autoCancel: false }
      );
      toast.success('Password updated successfully');
      setPasswords({ oldPassword: '', password: '', passwordConfirm: '' });
      await refreshUser();
    } catch (error) {
      toast.error(error.response?.message || 'Failed to update password. Check your current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>My Profile - BELIBELI DIGITAL MANAGER</title>
      </Helmet>
      <AppShell>
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>
                Profile
              </h1>
              <p className="text-muted-foreground">Manage your account and security.</p>
            </div>

            <div className="space-y-6">
              <Card className="shadow-sm border-border/50">
                <CardHeader className="pb-4 border-b border-border/50">
                  <CardTitle className="text-lg flex items-center">
                    <UserCircle className="w-5 h-5 mr-2 text-primary" />
                    Account
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={submitProfile} className="space-y-6">
                    <div>
                      <Label className="text-muted-foreground flex items-center">
                        <Mail className="w-3 h-3 mr-1" /> Email
                      </Label>
                      <p className="font-medium mt-1">{currentUser?.email || '—'}</p>
                      <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="profile-name">Display name</Label>
                        <Input
                          id="profile-name"
                          value={profile.name}
                          onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                          autoComplete="name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profile-company" className="flex items-center">
                          <Building2 className="w-3 h-3 mr-1" /> Company name
                        </Label>
                        <Input
                          id="profile-company"
                          value={profile.company_name}
                          onChange={(e) => setProfile((p) => ({ ...p, company_name: e.target.value }))}
                        />
                      </div>
                    </div>
                    <Button type="submit" disabled={profileLoading}>
                      {profileLoading ? 'Saving…' : 'Save profile'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/50">
                <CardHeader className="pb-4 border-b border-border/50">
                  <CardTitle className="text-lg flex items-center">
                    <KeyRound className="w-5 h-5 mr-2 text-primary" />
                    Change password
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={submitPasswordChange} className="space-y-4 max-w-md">
                    <div>
                      <Label htmlFor="oldPassword">Current password</Label>
                      <Input
                        id="oldPassword"
                        name="oldPassword"
                        type="password"
                        value={passwords.oldPassword}
                        onChange={handlePasswordChange}
                        className="mt-1"
                        autoComplete="current-password"
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">New password</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={passwords.password}
                        onChange={handlePasswordChange}
                        className="mt-1"
                        autoComplete="new-password"
                      />
                    </div>
                    <div>
                      <Label htmlFor="passwordConfirm">Confirm new password</Label>
                      <Input
                        id="passwordConfirm"
                        name="passwordConfirm"
                        type="password"
                        value={passwords.passwordConfirm}
                        onChange={handlePasswordChange}
                        className="mt-1"
                        autoComplete="new-password"
                      />
                    </div>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Saving…' : 'Update password'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </AppShell>
    </>
  );
};

export default LandlordProfilePage;
