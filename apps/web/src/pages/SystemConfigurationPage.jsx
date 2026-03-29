import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient';
import { getAppConfig, APP_CONFIG_COLLECTION } from '@/lib/appConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppShell from '@/components/AppShell.jsx';
import { toast } from 'sonner';
import { Settings, Loader2, MessageSquare, ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

const SystemConfigurationPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [form, setForm] = useState({
    system_name: '',
    landlord_public_name: '',
    contact_email: '',
    contact_phone: '',
    tenant_guide: '',
    invoice_footer_text: '',
    receipt_footer_text: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const row = await getAppConfig();
        if (row) {
          setRecordId(row.id);
          setForm({
            system_name: row.system_name ?? '',
            landlord_public_name: row.landlord_public_name ?? '',
            contact_email: row.contact_email ?? '',
            contact_phone: row.contact_phone ?? '',
            tenant_guide: row.tenant_guide ?? '',
            invoice_footer_text: row.invoice_footer_text ?? '',
            receipt_footer_text: row.receipt_footer_text ?? '',
          });
          if (row.logo) {
            setLogoPreview(pb.files.getUrl(row, row.logo));
          }
        }
      } catch (e) {
        console.error(e);
        toast.error('Could not load system configuration.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2MB.');
      return;
    }
    setLogoFile(f);
    setLogoPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('landlord_public_name', form.landlord_public_name.trim());
      fd.append('contact_email', form.contact_email.trim());
      fd.append('contact_phone', form.contact_phone.trim());
      fd.append('tenant_guide', form.tenant_guide);
      fd.append('system_name', form.system_name.trim());
      fd.append('invoice_footer_text', form.invoice_footer_text);
      fd.append('receipt_footer_text', form.receipt_footer_text);
      if (logoFile) {
        fd.append('logo', logoFile);
      }
      if (recordId) {
        await pb.collection(APP_CONFIG_COLLECTION).update(recordId, fd);
        toast.success('System configuration saved.');
      } else {
        const created = await pb.collection(APP_CONFIG_COLLECTION).create(fd);
        setRecordId(created.id);
        toast.success('System configuration created and saved.');
      }
      setLogoFile(null);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>System configuration — BELIBELI</title>
      </Helmet>
      <AppShell>
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-3xl">
          <div className="mb-8">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Settings className="h-4 w-4" />
              <span>Landlord</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">System configuration</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Branding is used on downloaded invoices and payment receipts. Public contact details appear in
              the site footer. The tenant guide is shown on the &quot;How to use&quot; page.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Branding &amp; PDF documents</CardTitle>
                  <CardDescription>
                    System name and logo appear at the top of invoice and receipt PDFs. Footer text is printed
                    at the bottom of each page.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="system_name">System name (invoices &amp; receipts)</Label>
                    <Input
                      id="system_name"
                      name="system_name"
                      value={form.system_name}
                      onChange={handleChange}
                      placeholder="e.g. Beli Beli Ltd"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Logo (optional, max 2MB, JPG/PNG/WebP)</Label>
                    <div className="flex flex-wrap items-start gap-4">
                      <div className="flex h-16 w-40 items-center justify-center rounded-lg border border-dashed bg-muted/40">
                        {logoPreview ? (
                          <img src={logoPreview} alt="" className="max-h-14 max-w-[9rem] object-contain" />
                        ) : (
                          <ImageIcon className="h-8 w-8 text-muted-foreground opacity-50" />
                        )}
                      </div>
                      <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleLogoChange} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoice_footer_text">Invoice footer (bank details, VAT, terms…)</Label>
                    <Textarea
                      id="invoice_footer_text"
                      name="invoice_footer_text"
                      value={form.invoice_footer_text}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Text shown on every invoice PDF page footer."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="receipt_footer_text">Receipt footer (optional)</Label>
                    <Textarea
                      id="receipt_footer_text"
                      name="receipt_footer_text"
                      value={form.receipt_footer_text}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Leave blank to reuse invoice footer text on payment receipts."
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Landlord contact (public)</CardTitle>
                  <CardDescription>
                    Shown in the footer site-wide. Leave fields blank to hide them.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="landlord_public_name">Display name (optional)</Label>
                    <Input
                      id="landlord_public_name"
                      name="landlord_public_name"
                      value={form.landlord_public_name}
                      onChange={handleChange}
                      placeholder="e.g. Acme Property Management"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Contact email</Label>
                    <Input
                      id="contact_email"
                      name="contact_email"
                      type="email"
                      value={form.contact_email}
                      onChange={handleChange}
                      placeholder="hello@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">Contact phone</Label>
                    <Input
                      id="contact_phone"
                      name="contact_phone"
                      value={form.contact_phone}
                      onChange={handleChange}
                      placeholder="+1 …"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tenant guide (English)</CardTitle>
                  <CardDescription>
                    Plain text. Line breaks are preserved. This is the &quot;How to use the portal&quot; page
                    for tenants.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    id="tenant_guide"
                    name="tenant_guide"
                    value={form.tenant_guide}
                    onChange={handleChange}
                    rows={18}
                    className="font-mono text-sm min-h-[280px]"
                    placeholder="Write step-by-step instructions for tenants…"
                  />
                </CardContent>
              </Card>

              <Button type="submit" disabled={saving} className="min-w-[140px]">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save changes'
                )}
              </Button>
            </form>
          )}

          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                SMS &amp; notifications
              </CardTitle>
              <CardDescription>
                Twilio credentials, templates, automation, and delivery logs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <Link to="/settings/sms">Open SMS settings</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </AppShell>
    </>
  );
};

export default SystemConfigurationPage;
