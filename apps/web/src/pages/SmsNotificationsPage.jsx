import React, { useEffect, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import AppShell from '@/components/AppShell.jsx';
import { toast } from 'sonner';
import { MessageSquare, Loader2, Pencil, Plus, Trash2, Link2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

const TEMPLATE_TYPES = ['rent_reminder', 'lease_expiry', 'payment_confirmation'];
const EVENT_TYPES = [
  'lease_expiry',
  'invoice',
  'payment_reminder',
  'payment_received',
  'payment_rejected',
  'lease_renewal',
];

const SmsNotificationsPage = () => {
  const [tab, setTab] = useState('config');
  const [loading, setLoading] = useState(true);

  const [config, setConfig] = useState(null);
  const [configForm, setConfigForm] = useState({
    account_sid: '',
    auth_token: '',
    twilio_phone_number: '',
    enabled: false,
  });
  const [savingConfig, setSavingConfig] = useState(false);

  const [templates, setTemplates] = useState([]);
  const [tplDialog, setTplDialog] = useState(false);
  const [editingTpl, setEditingTpl] = useState(null);
  const [tplForm, setTplForm] = useState({
    template_name: '',
    template_type: 'rent_reminder',
    template_text: '',
    active: true,
  });

  const [automations, setAutomations] = useState([]);
  const [autoDialog, setAutoDialog] = useState(false);
  const [editingAuto, setEditingAuto] = useState(null);
  const [autoForm, setAutoForm] = useState({
    event_type: 'invoice',
    template_id: '',
    enabled: false,
  });

  const [logs, setLogs] = useState([]);
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);
  const perPage = 20;

  const loadConfig = useCallback(async () => {
    const list = await pb.collection('sms_config').getFullList({ $autoCancel: false });
    if (list.length) {
      const c = list[0];
      setConfig(c);
      setConfigForm({
        account_sid: c.account_sid || '',
        auth_token: c.auth_token || '',
        twilio_phone_number: c.twilio_phone_number || '',
        enabled: !!c.enabled,
      });
    } else {
      setConfig(null);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    const list = await pb.collection('sms_templates').getFullList({ sort: 'template_name', $autoCancel: false });
    setTemplates(list);
  }, []);

  const loadAutomations = useCallback(async () => {
    const list = await pb.collection('sms_automation').getFullList({
      expand: 'template_id',
      sort: 'event_type',
      $autoCancel: false,
    });
    setAutomations(list);
  }, []);

  const loadLogs = useCallback(async () => {
    const res = await pb.collection('sms_logs').getList(logPage, perPage, {
      sort: '-created',
      expand: 'recipient_id',
      $autoCancel: false,
    });
    setLogs(res.items);
    setLogTotalPages(res.totalPages || 1);
  }, [logPage]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([loadConfig(), loadTemplates(), loadAutomations()]);
      } catch (e) {
        console.error(e);
        toast.error('Could not load SMS settings.');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadConfig, loadTemplates, loadAutomations]);

  useEffect(() => {
    if (tab === 'logs') {
      loadLogs().catch((e) => {
        console.error(e);
        toast.error('Could not load SMS logs.');
      });
    }
  }, [tab, loadLogs]);

  const saveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const payload = {
        account_sid: configForm.account_sid.trim(),
        auth_token: configForm.auth_token.trim(),
        twilio_phone_number: configForm.twilio_phone_number.trim(),
        enabled: configForm.enabled,
      };
      if (config?.id) {
        await pb.collection('sms_config').update(config.id, payload);
      } else {
        await pb.collection('sms_config').create(payload);
      }
      toast.success('SMS configuration saved.');
      await loadConfig();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Save failed.');
    } finally {
      setSavingConfig(false);
    }
  };

  const openNewTemplate = () => {
    setEditingTpl(null);
    setTplForm({
      template_name: '',
      template_type: 'rent_reminder',
      template_text: '',
      active: true,
    });
    setTplDialog(true);
  };

  const openEditTemplate = (t) => {
    setEditingTpl(t);
    setTplForm({
      template_name: t.template_name || '',
      template_type: t.template_type || 'rent_reminder',
      template_text: t.template_text || '',
      active: !!t.active,
    });
    setTplDialog(true);
  };

  const saveTemplate = async () => {
    try {
      const payload = {
        template_name: tplForm.template_name.trim(),
        template_type: tplForm.template_type,
        template_text: tplForm.template_text,
        active: tplForm.active,
      };
      if (editingTpl) {
        await pb.collection('sms_templates').update(editingTpl.id, payload);
        toast.success('Template updated.');
      } else {
        await pb.collection('sms_templates').create(payload);
        toast.success('Template created.');
      }
      setTplDialog(false);
      await loadTemplates();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Failed to save template.');
    }
  };

  const deleteTemplate = async (t) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await pb.collection('sms_templates').delete(t.id);
      toast.success('Template deleted.');
      await loadTemplates();
    } catch (err) {
      console.error(err);
      toast.error('Delete failed (may be in use by automation).');
    }
  };

  const openNewAuto = () => {
    if (!templates.length) {
      toast.message('Create at least one SMS template first.');
      return;
    }
    setEditingAuto(null);
    setAutoForm({
      event_type: 'invoice',
      template_id: templates[0].id,
      enabled: true,
    });
    setAutoDialog(true);
  };

  const openEditAuto = (a) => {
    setEditingAuto(a);
    setAutoForm({
      event_type: a.event_type,
      template_id: a.template_id,
      enabled: !!a.enabled,
    });
    setAutoDialog(true);
  };

  const saveAutomation = async () => {
    try {
      const payload = {
        event_type: autoForm.event_type,
        template_id: autoForm.template_id,
        enabled: autoForm.enabled,
      };
      if (editingAuto) {
        await pb.collection('sms_automation').update(editingAuto.id, payload);
        toast.success('Automation updated.');
      } else {
        await pb.collection('sms_automation').create(payload);
        toast.success('Automation created.');
      }
      setAutoDialog(false);
      await loadAutomations();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Failed to save automation.');
    }
  };

  const deleteAuto = async (a) => {
    if (!window.confirm('Delete this automation rule?')) return;
    try {
      await pb.collection('sms_automation').delete(a.id);
      toast.success('Removed.');
      await loadAutomations();
    } catch (err) {
      console.error(err);
      toast.error('Delete failed.');
    }
  };

  if (loading) {
    return (
      <AppShell>
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </main>
      </AppShell>
    );
  }

  return (
    <>
      <Helmet>
        <title>SMS &amp; notifications — BELIBELI</title>
      </Helmet>
      <AppShell>
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-5xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <MessageSquare className="h-4 w-4" />
                <span>Landlord</span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">SMS &amp; notifications</h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                Configure Twilio credentials, message templates, and automation rules. Sending SMS also requires
                server-side hooks or scheduled jobs — this screen manages stored configuration only.
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/settings" className="inline-flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                System configuration
              </Link>
            </Button>
          </div>

          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base">Automated lease-end SMS (Twilio)</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                <strong>How to enable:</strong> open the <strong>Twilio</strong> tab below, enter Account SID, Auth
                Token, and your Twilio sender number (E.164, e.g. +1234567890), turn on{' '}
                <strong>Enable SMS</strong>, then save. The server reads these credentials from the database — no
                server env vars required.
                <span className="block mt-2">
                  A daily job (08:00 UTC) sends texts when an active lease ends in <strong>15 days</strong> or{' '}
                  <strong>5 days</strong>. Recipients use <strong>tenants.phone</strong> and the landlord&apos;s{' '}
                  <strong>users.phone</strong> (numbers without + are normalized with +255 for Tanzania).
                </span>
                <span className="block mt-2 text-muted-foreground">
                  Optional override: set <code className="text-xs bg-muted px-1 rounded">TWILIO_ACCOUNT_SID</code>,{' '}
                  <code className="text-xs bg-muted px-1 rounded">TWILIO_AUTH_TOKEN</code>,{' '}
                  <code className="text-xs bg-muted px-1 rounded">TWILIO_FROM_NUMBER</code> on the host if you prefer
                  secrets outside the database.
                </span>
              </CardDescription>
            </CardHeader>
          </Card>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-4 max-w-2xl">
              <TabsTrigger value="config">Twilio</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="automation">Automation</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Twilio credentials</CardTitle>
                  <CardDescription>Account SID, auth token, and sender number. Keep these secret.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={saveConfig} className="space-y-4 max-w-lg">
                    <div className="flex items-center justify-between gap-4">
                      <Label htmlFor="sms-enabled">Enable SMS</Label>
                      <Switch
                        id="sms-enabled"
                        checked={configForm.enabled}
                        onCheckedChange={(v) => setConfigForm((p) => ({ ...p, enabled: v }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sid">Account SID</Label>
                      <Input
                        id="sid"
                        value={configForm.account_sid}
                        onChange={(e) => setConfigForm((p) => ({ ...p, account_sid: e.target.value }))}
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="token">Auth token</Label>
                      <Input
                        id="token"
                        type="password"
                        value={configForm.auth_token}
                        onChange={(e) => setConfigForm((p) => ({ ...p, auth_token: e.target.value }))}
                        autoComplete="new-password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="from">Twilio phone number</Label>
                      <Input
                        id="from"
                        placeholder="+1…"
                        value={configForm.twilio_phone_number}
                        onChange={(e) => setConfigForm((p) => ({ ...p, twilio_phone_number: e.target.value }))}
                      />
                    </div>
                    <Button type="submit" disabled={savingConfig}>
                      {savingConfig ? 'Saving…' : 'Save'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="templates" className="mt-6 space-y-4">
              <div className="flex justify-end">
                <Button onClick={openNewTemplate}>
                  <Plus className="h-4 w-4 mr-2" />
                  New template
                </Button>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            No templates yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        templates.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="font-medium">{t.template_name}</TableCell>
                            <TableCell>{t.template_type}</TableCell>
                            <TableCell>{t.active ? 'Yes' : 'No'}</TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditTemplate(t)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => deleteTemplate(t)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="automation" className="mt-6 space-y-4">
              <div className="flex justify-end">
                <Button onClick={openNewAuto}>
                  <Plus className="h-4 w-4 mr-2" />
                  New rule
                </Button>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Template</TableHead>
                        <TableHead>Enabled</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {automations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            No automation rules.
                          </TableCell>
                        </TableRow>
                      ) : (
                        automations.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell>{a.event_type}</TableCell>
                            <TableCell>{a.expand?.template_id?.template_name || a.template_id}</TableCell>
                            <TableCell>{a.enabled ? 'Yes' : 'No'}</TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditAuto(a)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => deleteAuto(a)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs" className="mt-6">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            No log entries yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        logs.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="whitespace-nowrap text-sm">
                              {row.created ? new Date(row.created).toLocaleString() : '—'}
                            </TableCell>
                            <TableCell>{row.recipient_phone}</TableCell>
                            <TableCell className="max-w-[140px] truncate">{row.message_type}</TableCell>
                            <TableCell>{row.status}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              {logTotalPages > 1 && (
                <Pagination className="mt-4">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setLogPage((p) => Math.max(1, p - 1));
                        }}
                        className={logPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <span className="px-3 text-sm text-muted-foreground">
                        Page {logPage} of {logTotalPages}
                      </span>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setLogPage((p) => Math.min(logTotalPages, p + 1));
                        }}
                        className={logPage >= logTotalPages ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </TabsContent>
          </Tabs>

          <Dialog open={tplDialog} onOpenChange={setTplDialog}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingTpl ? 'Edit template' : 'New template'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={tplForm.template_name}
                    onChange={(e) => setTplForm((p) => ({ ...p, template_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={tplForm.template_type}
                    onValueChange={(v) => setTplForm((p) => ({ ...p, template_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    rows={5}
                    value={tplForm.template_text}
                    onChange={(e) => setTplForm((p) => ({ ...p, template_text: e.target.value }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Active</Label>
                  <Switch
                    checked={tplForm.active}
                    onCheckedChange={(v) => setTplForm((p) => ({ ...p, active: v }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTplDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={saveTemplate}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={autoDialog} onOpenChange={setAutoDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingAuto ? 'Edit automation' : 'New automation'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-2">
                  <Label>Event</Label>
                  <Select
                    value={autoForm.event_type}
                    onValueChange={(v) => setAutoForm((p) => ({ ...p, event_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Template</Label>
                  <Select
                    value={autoForm.template_id}
                    onValueChange={(v) => setAutoForm((p) => ({ ...p, template_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.template_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Enabled</Label>
                  <Switch
                    checked={autoForm.enabled}
                    onCheckedChange={(v) => setAutoForm((p) => ({ ...p, enabled: v }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAutoDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={saveAutomation}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </AppShell>
    </>
  );
};

export default SmsNotificationsPage;
