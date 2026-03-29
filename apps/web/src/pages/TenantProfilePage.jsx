import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { getAppConfig } from '@/lib/appConfig';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserCircle, Mail, Phone, MapPin, Shield, Bell, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const NOTIF_FREQ = ['immediate', 'daily', 'weekly'];

const TenantProfilePage = () => {
  const { currentUser, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tenantData, setTenantData] = useState(null);
  const [contactEmail, setContactEmail] = useState('');

  const [passwords, setPasswords] = useState({
    oldPassword: '',
    password: '',
    passwordConfirm: '',
  });
  const [pwdLoading, setPwdLoading] = useState(false);

  const [notifId, setNotifId] = useState(null);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifForm, setNotifForm] = useState({
    phone_number: '',
    lease_expiry_alerts: true,
    invoice_notifications: true,
    payment_reminders: true,
    payment_received_notifications: true,
    payment_rejected_notifications: true,
    lease_renewal_reminders: true,
    notification_frequency: 'immediate',
    quiet_hours_start: '',
    quiet_hours_end: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const cfg = await getAppConfig();
        setContactEmail(cfg?.contact_email?.trim() || '');
      } catch {
        setContactEmail('');
      }
    })();
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;
    (async () => {
      setLoading(true);
      try {
        const record = await pb.collection('tenants').getFirstListItem(`user_id = "${currentUser.id}"`, {
          $autoCancel: false,
        });
        setTenantData(record);

        try {
          const existing = await pb.collection('notification_preferences').getFirstListItem(
            `user_id = "${currentUser.id}"`,
            { $autoCancel: false }
          );
          setNotifId(existing.id);
          setNotifForm({
            phone_number: existing.phone_number || record.phone || '',
            lease_expiry_alerts: !!existing.lease_expiry_alerts,
            invoice_notifications: !!existing.invoice_notifications,
            payment_reminders: !!existing.payment_reminders,
            payment_received_notifications: !!existing.payment_received_notifications,
            payment_rejected_notifications: !!existing.payment_rejected_notifications,
            lease_renewal_reminders: !!existing.lease_renewal_reminders,
            notification_frequency: existing.notification_frequency || 'immediate',
            quiet_hours_start: existing.quiet_hours_start || '',
            quiet_hours_end: existing.quiet_hours_end || '',
          });
        } catch {
          setNotifId(null);
          setNotifForm((prev) => ({
            ...prev,
            phone_number: record.phone || currentUser.phone || '',
          }));
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Could not load profile.');
      } finally {
        setLoading(false);
      }
    })();
  }, [currentUser?.id]);

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
      toast.error('Password must be at least 8 characters');
      return;
    }
    setPwdLoading(true);
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
      toast.success('Password updated');
      setPasswords({ oldPassword: '', password: '', passwordConfirm: '' });
      await refreshUser();
    } catch (error) {
      toast.error(error?.message || 'Failed to update password');
    } finally {
      setPwdLoading(false);
    }
  };

  const openRequestUpdateMail = () => {
    const landlordEmail = contactEmail;
    const subject = encodeURIComponent('Tenant profile update request');
    const body = encodeURIComponent(
      `Hello,\n\nI would like to request an update to my tenant profile details.\n\n` +
        `Tenant: ${tenantData?.name || currentUser?.name || ''}\n` +
        `Unit / account email: ${currentUser?.email || ''}\n\n` +
        `Please describe what you need changed below:\n\n`
    );
    if (landlordEmail) {
      window.location.href = `mailto:${landlordEmail}?subject=${subject}&body=${body}`;
    } else {
      toast.message('Your landlord has not set a public contact email. Please contact them directly.');
    }
  };

  const saveNotificationPrefs = async (e) => {
    e.preventDefault();
    if (!currentUser?.id) return;
    setNotifSaving(true);
    try {
      const payload = {
        user_id: currentUser.id,
        phone_number: notifForm.phone_number.trim() || '0000000000',
        lease_expiry_alerts: notifForm.lease_expiry_alerts,
        invoice_notifications: notifForm.invoice_notifications,
        payment_reminders: notifForm.payment_reminders,
        payment_received_notifications: notifForm.payment_received_notifications,
        payment_rejected_notifications: notifForm.payment_rejected_notifications,
        lease_renewal_reminders: notifForm.lease_renewal_reminders,
        notification_frequency: notifForm.notification_frequency,
        quiet_hours_start: notifForm.quiet_hours_start.trim(),
        quiet_hours_end: notifForm.quiet_hours_end.trim(),
      };
      if (notifId) {
        await pb.collection('notification_preferences').update(notifId, payload);
      } else {
        const created = await pb.collection('notification_preferences').create(payload);
        setNotifId(created.id);
      }
      toast.success('Notification preferences saved');
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Could not save preferences');
    } finally {
      setNotifSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>My Profile - BELIBELI DIGITAL MANAGER</title>
      </Helmet>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>
            My Profile
          </h1>
          <p className="text-muted-foreground">Your tenant record and account security.</p>
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-4 border-b border-border/50">
              <CardTitle className="text-lg flex items-center">
                <UserCircle className="w-5 h-5 mr-2 text-primary" />
                Personal information
              </CardTitle>
              <CardDescription>
                Official details are managed by your landlord. Use the button below to request changes by email
                (when a contact email is configured).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Full name</p>
                  <p className="font-medium">{tenantData?.name || currentUser.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">ID number</p>
                  <p className="font-medium">{tenantData?.id_number || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1 flex items-center">
                    <Mail className="w-3.5 h-3.5 mr-1" /> Email
                  </p>
                  <p className="font-medium">{tenantData?.email || currentUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1 flex items-center">
                    <Phone className="w-3.5 h-3.5 mr-1" /> Phone
                  </p>
                  <p className="font-medium">{tenantData?.phone || '-'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground mb-1 flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-1" /> Address
                  </p>
                  <p className="font-medium">{tenantData?.address || '-'}</p>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-border/50">
                <Button type="button" variant="outline" onClick={openRequestUpdateMail}>
                  Request profile update
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Opens your email app with a message to the landlord contact from system settings (if set).
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-4 border-b border-border/50">
              <CardTitle className="text-lg flex items-center">
                <Bell className="w-5 h-5 mr-2 text-primary" />
                Notification preferences
              </CardTitle>
              <CardDescription>
                Stored for SMS/automation when your landlord enables it. Delivery still depends on server
                configuration.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={saveNotificationPrefs} className="space-y-4">
                <div className="space-y-2 max-w-md">
                  <Label htmlFor="notif-phone">SMS phone number</Label>
                  <Input
                    id="notif-phone"
                    value={notifForm.phone_number}
                    onChange={(e) => setNotifForm((p) => ({ ...p, phone_number: e.target.value }))}
                    placeholder="+254…"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['lease_expiry_alerts', 'Lease expiry alerts'],
                    ['invoice_notifications', 'Invoice notifications'],
                    ['payment_reminders', 'Payment reminders'],
                    ['payment_received_notifications', 'Payment received'],
                    ['payment_rejected_notifications', 'Payment rejected'],
                    ['lease_renewal_reminders', 'Lease renewal reminders'],
                  ].map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-2">
                      <Label htmlFor={key} className="text-sm font-normal cursor-pointer">
                        {label}
                      </Label>
                      <Switch
                        id={key}
                        checked={!!notifForm[key]}
                        onCheckedChange={(v) => setNotifForm((p) => ({ ...p, [key]: v }))}
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-2 max-w-xs">
                  <Label>Frequency</Label>
                  <Select
                    value={notifForm.notification_frequency}
                    onValueChange={(v) => setNotifForm((p) => ({ ...p, notification_frequency: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NOTIF_FREQ.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="qh-s">Quiet hours start</Label>
                    <Input
                      id="qh-s"
                      placeholder="e.g. 22:00"
                      value={notifForm.quiet_hours_start}
                      onChange={(e) => setNotifForm((p) => ({ ...p, quiet_hours_start: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qh-e">Quiet hours end</Label>
                    <Input
                      id="qh-e"
                      placeholder="e.g. 07:00"
                      value={notifForm.quiet_hours_end}
                      onChange={(e) => setNotifForm((p) => ({ ...p, quiet_hours_end: e.target.value }))}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={notifSaving}>
                  {notifSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    'Save notification preferences'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-4 border-b border-border/50">
              <CardTitle className="text-lg flex items-center">
                <Shield className="w-5 h-5 mr-2 text-primary" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={submitPasswordChange} className="space-y-4 max-w-md">
                <div>
                  <Label htmlFor="t-old-pw">Current password</Label>
                  <Input
                    id="t-old-pw"
                    name="oldPassword"
                    type="password"
                    value={passwords.oldPassword}
                    onChange={handlePasswordChange}
                    className="mt-1"
                    autoComplete="current-password"
                  />
                </div>
                <div>
                  <Label htmlFor="t-new-pw">New password</Label>
                  <Input
                    id="t-new-pw"
                    name="password"
                    type="password"
                    value={passwords.password}
                    onChange={handlePasswordChange}
                    className="mt-1"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <Label htmlFor="t-confirm-pw">Confirm new password</Label>
                  <Input
                    id="t-confirm-pw"
                    name="passwordConfirm"
                    type="password"
                    value={passwords.passwordConfirm}
                    onChange={handlePasswordChange}
                    className="mt-1"
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" disabled={pwdLoading}>
                  {pwdLoading ? 'Updating…' : 'Update password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default TenantProfilePage;
