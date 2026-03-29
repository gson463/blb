
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppShell from '@/components/AppShell.jsx';
import { UserCircle, Mail, Phone, Shield, KeyRound, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const StaffProfilePage = () => {
  const { currentUser, staffRole, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passwords, setPasswords] = useState({
    oldPassword: '',
    password: '',
    passwordConfirm: ''
  });

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords(prev => ({ ...prev, [name]: value }));
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
      await pb.collection('users').update(currentUser.id, {
        oldPassword: passwords.oldPassword,
        password: passwords.password,
        passwordConfirm: passwords.passwordConfirm
      }, { $autoCancel: false });
      
      toast.success('Password updated successfully');
      setPasswords({ oldPassword: '', password: '', passwordConfirm: '' });
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
              <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>Staff Profile</h1>
              <p className="text-muted-foreground">Manage your account settings and security.</p>
            </div>

            <div className="space-y-6">
              <Card className="shadow-sm border-border/50">
                <CardHeader className="pb-4 border-b border-border/50">
                  <CardTitle className="text-lg flex items-center">
                    <UserCircle className="w-5 h-5 mr-2 text-primary" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Full Name</p>
                      <p className="font-medium text-lg">{currentUser?.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Role</p>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary uppercase tracking-wider">
                        {staffRole || 'Staff'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1 flex items-center">
                        <Mail className="w-3.5 h-3.5 mr-1" /> Email Address
                      </p>
                      <p className="font-medium">{currentUser?.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1 flex items-center">
                        <Phone className="w-3.5 h-3.5 mr-1" /> Phone Number
                      </p>
                      <p className="font-medium">{currentUser?.phone || 'Not provided'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground mb-1 flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1" /> Account Created
                      </p>
                      <p className="font-medium">{new Date(currentUser?.created).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/50">
                <CardHeader className="pb-4 border-b border-border/50">
                  <CardTitle className="text-lg flex items-center">
                    <KeyRound className="w-5 h-5 mr-2 text-primary" />
                    Change Password
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={submitPasswordChange} className="space-y-4 max-w-md">
                    <div>
                      <Label htmlFor="oldPassword">Current Password</Label>
                      <Input
                        id="oldPassword"
                        name="oldPassword"
                        type="password"
                        value={passwords.oldPassword}
                        onChange={handlePasswordChange}
                        required
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">New Password</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={passwords.password}
                        onChange={handlePasswordChange}
                        required
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="passwordConfirm">Confirm New Password</Label>
                      <Input
                        id="passwordConfirm"
                        name="passwordConfirm"
                        type="password"
                        value={passwords.passwordConfirm}
                        onChange={handlePasswordChange}
                        required
                        className="mt-1.5"
                      />
                    </div>
                    <Button type="submit" disabled={loading} className="mt-2">
                      {loading ? 'Updating...' : 'Update Password'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button variant="destructive" onClick={logout} className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground">
                  Log Out
                </Button>
              </div>
            </div>
          </div>
        </main>
      </AppShell>
    </>
  );
};

export default StaffProfilePage;
