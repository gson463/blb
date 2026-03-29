import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { formatCurrency, formatDate } from '@/lib/paymentUtils';
import { downloadInvoicePdf } from '@/lib/pdfUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Receipt, Download, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const PAGE_SIZE = 50;

function buildTenantInvoiceListFilter(tenantId, filterStatus) {
  let f = `tenant_id = "${tenantId}"`;
  if (filterStatus === 'unpaid') return `${f} && status = "Unpaid"`;
  if (filterStatus === 'pending') return `${f} && status = "Pending Approval"`;
  if (filterStatus === 'paid') return `${f} && status = "Paid"`;
  return f;
}

const TenantInvoicesPage = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tenantId, setTenantId] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    unpaid: 0,
    pending: 0,
    paid: 0,
  });

  useEffect(() => {
    setPage(1);
  }, [filterStatus]);

  useEffect(() => {
    if (!currentUser?.id) return;
    (async () => {
      setStatsLoading(true);
      try {
        const tenantRecord = await pb.collection('tenants').getFirstListItem(`user_id = "${currentUser.id}"`, {
          $autoCancel: false,
        });
        setTenantId(tenantRecord.id);
        const all = await pb.collection('invoices').getFullList({
          filter: `tenant_id = "${tenantRecord.id}"`,
          $autoCancel: false,
        });
        setStats({
          total: all.length,
          unpaid: all.filter((i) => i.status === 'Unpaid').length,
          pending: all.filter((i) => i.status === 'Pending Approval').length,
          paid: all.filter((i) => i.status === 'Paid').length,
        });
      } catch (e) {
        console.error(e);
        setTenantId('');
      } finally {
        setStatsLoading(false);
      }
    })();
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;
    if (tenantId === '') {
      setLoading(false);
      return;
    }
    if (tenantId == null) return;
    (async () => {
      setLoading(true);
      try {
        const filter = buildTenantInvoiceListFilter(tenantId, filterStatus);
        const res = await pb.collection('invoices').getList(page, PAGE_SIZE, {
          filter,
          expand: 'property_id,unit_id,tenant_id',
          sort: '-created',
          $autoCancel: false,
        });
        setInvoices(res.items);
        setTotalPages(res.totalPages || 1);
      } catch (error) {
        console.error('Error fetching invoices:', error);
        toast.error('Failed to load invoices');
      } finally {
        setLoading(false);
      }
    })();
  }, [currentUser?.id, tenantId, page, filterStatus]);

  const handleDownloadInvoice = (invoice) => {
    try {
      downloadInvoicePdf(invoice, {
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

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tenantId === '') {
    return (
      <>
        <Helmet>
          <title>My Invoices - BELIBELI DIGITAL MANAGER</title>
        </Helmet>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center text-muted-foreground">
          <Receipt className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium text-foreground">No tenant profile linked</p>
          <p className="text-sm mt-2">Contact your landlord to link this account to a unit.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>My Invoices - BELIBELI DIGITAL MANAGER</title>
      </Helmet>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>
              Invoices
            </h1>
            <p className="text-muted-foreground">View and manage your rent invoices.</p>
          </div>
          <div className="flex items-center space-x-3">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Invoices</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="pending">Pending approval</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
            <Button asChild>
              <Link to="/tenant/upload-payment">
                <Upload className="w-4 h-4 mr-2" /> Pay Now
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-muted/30 border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{statsLoading ? '—' : stats.total}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Total</p>
            </CardContent>
          </Card>
          <Card className="bg-destructive/5 border-destructive/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-destructive">{statsLoading ? '—' : stats.unpaid}</p>
              <p className="text-xs text-destructive/80 uppercase tracking-wider mt-1">Unpaid</p>
            </CardContent>
          </Card>
          <Card className="bg-accent/5 border-accent/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-accent">{statsLoading ? '—' : stats.pending}</p>
              <p className="text-xs text-accent/80 uppercase tracking-wider mt-1">Pending</p>
            </CardContent>
          </Card>
          <Card className="bg-secondary/5 border-secondary/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-secondary">{statsLoading ? '—' : stats.paid}</p>
              <p className="text-xs text-secondary/80 uppercase tracking-wider mt-1">Paid</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm border-border/50">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date Issued</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Receipt className="w-8 h-8 mx-auto mb-3 opacity-20" />
                      No invoices found
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice) => {
                    const isOverdue =
                      invoice.status === 'Unpaid' && new Date(invoice.due_date) < new Date();
                    return (
                      <TableRow key={invoice.id} className={isOverdue ? 'bg-destructive/5' : ''}>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>{formatDate(invoice.created)}</TableCell>
                        <TableCell className={isOverdue ? 'text-destructive font-medium flex items-center' : ''}>
                          {formatDate(invoice.due_date)}
                          {isOverdue && <AlertCircle className="w-3 h-3 ml-1" />}
                        </TableCell>
                        <TableCell className="font-bold">{formatCurrency(invoice.amount)}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                              invoice.status === 'Paid'
                                ? 'bg-secondary/10 text-secondary'
                                : invoice.status === 'Unpaid'
                                  ? 'bg-destructive/10 text-destructive'
                                  : 'bg-accent/10 text-accent'
                            }`}
                          >
                            {isOverdue ? 'Overdue' : invoice.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            {invoice.status === 'Unpaid' && (
                              <Button size="sm" variant="outline" asChild className="h-8">
                                <Link to="/tenant/upload-payment">Pay</Link>
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDownloadInvoice(invoice)}
                              title="Download PDF"
                              className="h-8 w-8"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
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
      </div>
    </>
  );
};

export default TenantInvoicesPage;
