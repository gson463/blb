
import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { buildInvoiceListFilter, buildPropertiesFilter, getLandlordScopeId } from '@/lib/staffDataScope';
import { downloadCsv, parseCsv } from '@/lib/csvUtils';
import { downloadInvoicePdf } from '@/lib/pdfUtils';
import { calculateInvoiceStatus, generateInvoiceNumber } from '@/lib/invoiceUtils';
import { AmountText } from '@/components/AmountText.jsx';
import { logActivity } from '@/lib/activityLog';
import { dateAtNoonEAT } from '@/lib/datetimeEAT';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import AppShell from '@/components/AppShell.jsx';
import InvoiceForm from '@/components/InvoiceForm.jsx';
import { Plus, FileText, Edit, Trash2, Download, CheckCircle, Upload } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { toast } from 'sonner';

const InvoiceManagement = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [properties, setProperties] = useState([]);
  const [filterProperty, setFilterProperty] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 50;
  const [showForm, setShowForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedIds, setSelectedIds] = useState({});
  const importInputRef = useRef(null);

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filterProperty, filterStatus]);

  useEffect(() => {
    fetchInvoices();
  }, [page, filterProperty, filterStatus, currentUser?.id]);

  const fetchProperties = async () => {
    try {
      const records = await pb.collection('properties').getFullList({
        filter: buildPropertiesFilter(currentUser),
        $autoCancel: false
      });
      setProperties(records);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const filter = buildInvoiceListFilter(currentUser, filterProperty, filterStatus);
      const records = await pb.collection('invoices').getList(page, pageSize, {
        filter,
        expand: 'unit_id,tenant_id,property_id',
        sort: '-created',
        $autoCancel: false,
      });
      setInvoices(records.items);
      setTotalPages(records.totalPages || 1);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (invoice) => {
    setSelectedInvoice(invoice);
    setShowForm(true);
  };

  const handleDelete = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;

    try {
      await pb.collection('invoices').delete(invoiceId, { $autoCancel: false });
      toast.success('Invoice deleted successfully');
      fetchInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  const handleMarkAsPaid = async (invoiceId) => {
    try {
      await pb.collection('invoices').update(invoiceId, { status: 'Paid' }, { $autoCancel: false });
      toast.success('Invoice marked as paid');
      fetchInvoices();
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice');
    }
  };

  const handleDownloadInvoice = async (invoice) => {
    try {
      await downloadInvoicePdf(invoice, {
        property_id: invoice.expand?.property_id,
        unit_id: invoice.expand?.unit_id,
        tenant_id: invoice.expand?.tenant_id,
      });
      toast.success('Invoice PDF downloaded');
    } catch (e) {
      console.error(e);
      toast.error('Could not generate PDF');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedInvoice(null);
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const allOnPageSelected =
    invoices.length > 0 && invoices.every((inv) => selectedIds[inv.id]);

  const selectAllOnPage = () => {
    const next = { ...selectedIds };
    invoices.forEach((inv) => {
      next[inv.id] = true;
    });
    setSelectedIds(next);
  };

  const clearSelection = () => setSelectedIds({});

  const selectedCount = Object.values(selectedIds).filter(Boolean).length;

  const handleBulkMarkPaid = async () => {
    const ids = invoices
      .filter((inv) => selectedIds[inv.id] && inv.status !== 'Paid')
      .map((inv) => inv.id);
    if (!ids.length) {
      toast.message('Select unpaid invoices to mark as paid');
      return;
    }
    let ok = 0;
    for (const id of ids) {
      try {
        await pb.collection('invoices').update(id, { status: 'Paid' }, { $autoCancel: false });
        ok++;
      } catch (e) {
        console.error(e);
      }
    }
    toast.success(`Marked ${ok} invoice${ok === 1 ? '' : 's'} as paid`);
    clearSelection();
    fetchInvoices();
  };

  const handleBulkDelete = async () => {
    const ids = Object.entries(selectedIds)
      .filter(([, v]) => v)
      .map(([id]) => id);
    if (!ids.length) {
      toast.message('Select invoices first');
      return;
    }
    if (!window.confirm(`Delete ${ids.length} invoice${ids.length === 1 ? '' : 's'}?`)) return;
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        await pb.collection('invoices').delete(id, { $autoCancel: false });
        ok++;
      } catch (e) {
        console.error(e);
        fail++;
      }
    }
    if (ok) toast.success(`Deleted ${ok} invoice${ok === 1 ? '' : 's'}`);
    if (fail) toast.error(`${fail} could not be deleted`);
    clearSelection();
    fetchInvoices();
  };

  const downloadTemplate = () => {
    downloadCsv('invoices-import-template.csv', [
      {
        property_id: '',
        unit_id: '',
        tenant_id: '',
        amount: '1200',
        due_date: '2026-04-01',
        status: 'Unpaid',
      },
    ]);
    toast.message('Use relation IDs from PocketBase admin or pick from each entity’s URL in the app');
  };

  const handleImportCsv = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    let text;
    try {
      text = await file.text();
    } catch (err) {
      console.error(err);
      toast.error('Could not read file');
      return;
    }
    const rows = parseCsv(text);
    if (!rows.length) {
      toast.error('No data rows found');
      return;
    }
    const lid = getLandlordScopeId(currentUser);
    let ok = 0;
    let fail = 0;
    for (const row of rows) {
      const property_id = row.property_id?.trim();
      const unit_id = row.unit_id?.trim();
      const tenant_id = row.tenant_id?.trim();
      const amount = parseFloat(row.amount);
      const dueRaw = row.due_date?.trim();
      if (!property_id || !unit_id || !tenant_id || !dueRaw || Number.isNaN(amount) || amount <= 0) {
        fail++;
        continue;
      }
      const due_date = dateAtNoonEAT(/^\d{4}-\d{2}-\d{2}$/.test(dueRaw) ? dueRaw : dueRaw.split('T')[0]);
      let status = row.status?.trim() || 'Unpaid';
      if (!['Unpaid', 'Paid', 'Pending Approval'].includes(status)) status = 'Unpaid';
      try {
        const data = {
          property_id,
          unit_id,
          tenant_id,
          amount,
          due_date,
          status,
          invoice_number: generateInvoiceNumber(),
        };
        const created = await pb.collection('invoices').create(data, { $autoCancel: false });
        ok++;
        await logActivity({
          user: currentUser,
          landlordId: lid || '',
          action: 'invoice.created',
          entity_type: 'invoice',
          entity_id: created.id,
          details: data.invoice_number,
        });
      } catch (err) {
        console.error(err);
        fail++;
      }
    }
    toast.message(`Created ${ok} invoice${ok === 1 ? '' : 's'}${fail ? ` (${fail} failed)` : ''}`);
    fetchInvoices();
  };

  if (loading) {
    return (
      <AppShell>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading invoices...</p>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <>
      <Helmet>
        <title>Invoice Management - BELIBELI DIGITAL MANAGER</title>
        <meta name="description" content="Manage rent invoices, track payments, and monitor overdue accounts." />
      </Helmet>
      <AppShell>
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>Invoice Management</h1>
                <p className="text-muted-foreground">Track and manage rent invoices</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={filterProperty} onValueChange={setFilterProperty}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by property" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Properties</SelectItem>
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Unpaid">Unpaid</SelectItem>
                    <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Invoice
                </Button>
              </div>
            </div>

            {invoices.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm mb-6">
                <span className="text-muted-foreground mr-2">Bulk: {selectedCount} selected</span>
                <Button type="button" variant="outline" size="sm" onClick={selectAllOnPage}>
                  Select page
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={handleBulkMarkPaid}>
                  Mark paid
                </Button>
                <Button type="button" variant="destructive" size="sm" onClick={handleBulkDelete}>
                  Delete selected
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-1" />
                  Template
                </Button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleImportCsv}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => importInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Import CSV
                </Button>
              </div>
            )}

            {invoices.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No invoices found</h3>
                  <p className="text-muted-foreground mb-4">Create a manual invoice to get started</p>
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Invoice
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={allOnPageSelected}
                            onCheckedChange={(v) => {
                              if (v) selectAllOnPage();
                              else {
                                const next = { ...selectedIds };
                                invoices.forEach((inv) => {
                                  delete next[inv.id];
                                });
                                setSelectedIds(next);
                              }
                            }}
                            aria-label="Select all on this page"
                          />
                        </TableHead>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Unit / Property</TableHead>
                        <TableHead>Tenant</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoices.map((invoice) => {
                        const displayStatus = calculateInvoiceStatus(invoice.due_date, invoice.status);
                        const isOverdue = displayStatus === 'Overdue';
                        
                        return (
                          <TableRow key={invoice.id} className={isOverdue ? 'bg-destructive/5 hover:bg-destructive/10' : ''}>
                            <TableCell className="w-10">
                              <Checkbox
                                checked={!!selectedIds[invoice.id]}
                                onCheckedChange={() => toggleSelect(invoice.id)}
                                aria-label={`Select invoice ${invoice.invoice_number}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                            <TableCell>
                              <div className="font-medium">{invoice.expand?.unit_id?.name}</div>
                              <div className="text-xs text-muted-foreground">{invoice.expand?.property_id?.name}</div>
                            </TableCell>
                            <TableCell>{invoice.expand?.tenant_id?.name}</TableCell>
                            <TableCell className="font-medium">
                              <AmountText value={invoice.amount} />
                            </TableCell>
                            <TableCell>
                              <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                                {new Date(invoice.due_date).toLocaleDateString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 text-xs font-medium rounded-lg ${
                                displayStatus === 'Paid' ? 'bg-secondary/10 text-secondary' :
                                displayStatus === 'Overdue' ? 'bg-destructive/10 text-destructive' :
                                displayStatus === 'Pending Approval' ? 'bg-accent/10 text-accent' :
                                'bg-muted text-muted-foreground'
                              }`}>
                                {displayStatus}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-1">
                                {invoice.status !== 'Paid' && (
                                  <Button variant="ghost" size="icon" onClick={() => handleMarkAsPaid(invoice.id)} title="Mark as Paid" className="text-secondary hover:text-secondary">
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" onClick={() => handleDownloadInvoice(invoice)} title="Download PDF">
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(invoice)} title="Edit">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(invoice.id)} className="text-destructive hover:text-destructive" title="Delete">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 && (
                  <div className="p-4 border-t flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setPage((p) => Math.max(1, p - 1));
                            }}
                            className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                          />
                        </PaginationItem>
                        <PaginationItem>
                          <span className="px-3 text-sm text-muted-foreground">
                            Page {page} of {totalPages}
                          </span>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setPage((p) => Math.min(totalPages, p + 1));
                            }}
                            className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </Card>
            )}
          </div>
        </main>
      </AppShell>

      {showForm && (
        <InvoiceForm
          invoice={selectedInvoice}
          onClose={handleFormClose}
          onSuccess={fetchInvoices}
        />
      )}
    </>
  );
};

export default InvoiceManagement;
