import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import {
  formatDate,
  isPaymentApproved,
  isPaymentPending,
  isPaymentRejected,
} from '@/lib/paymentUtils';
import { AmountText } from '@/components/AmountText.jsx';
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
import { CreditCard, FileImage, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const PAGE_SIZE = 50;

function buildTenantPaymentListFilter(tenantId, filterStatus) {
  let f = `tenant_id = "${tenantId}"`;
  if (filterStatus === 'approved') {
    return `${f} && (status = "Approved" || status = "approved")`;
  }
  if (filterStatus === 'pending') {
    return `${f} && (status = "Pending Approval" || status = "pending_approval")`;
  }
  if (filterStatus === 'rejected') {
    return `${f} && (status = "Rejected" || status = "rejected")`;
  }
  return f;
}

const TenantPaymentHistoryPage = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tenantId, setTenantId] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
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
        const all = await pb.collection('payments').getFullList({
          filter: `tenant_id = "${tenantRecord.id}"`,
          $autoCancel: false,
        });
        setStats({
          total: all.length,
          approved: all.filter((p) => isPaymentApproved(p.status)).length,
          pending: all.filter((p) => isPaymentPending(p.status)).length,
          rejected: all.filter((p) => isPaymentRejected(p.status)).length,
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
        const filter = buildTenantPaymentListFilter(tenantId, filterStatus);
        const res = await pb.collection('payments').getList(page, PAGE_SIZE, {
          filter,
          expand: 'invoice_id',
          sort: '-created',
          $autoCancel: false,
        });
        setPayments(res.items);
        setTotalPages(res.totalPages || 1);
      } catch (error) {
        console.error('Error fetching payments:', error);
        toast.error('Failed to load payment history');
      } finally {
        setLoading(false);
      }
    })();
  }, [currentUser?.id, tenantId, page, filterStatus]);

  const handleDownloadReceipt = (payment) => {
    if (payment.receipt_file) {
      const url = pb.files.getUrl(payment, payment.receipt_file);
      window.open(url, '_blank');
    } else {
      toast.error('No receipt file available');
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
          <title>Payment History - BELIBELI DIGITAL MANAGER</title>
        </Helmet>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center text-muted-foreground">
          <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium text-foreground">No tenant profile linked</p>
          <p className="text-sm mt-2">Contact your landlord to link this account to a unit.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Payment History - BELIBELI DIGITAL MANAGER</title>
      </Helmet>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>
              Payment History
            </h1>
            <p className="text-muted-foreground">Track your past payments and their approval status.</p>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-muted/30 border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{statsLoading ? '—' : stats.total}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Submitted</p>
            </CardContent>
          </Card>
          <Card className="bg-secondary/5 border-secondary/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-secondary">{statsLoading ? '—' : stats.approved}</p>
              <p className="text-xs text-secondary/80 uppercase tracking-wider mt-1">Approved</p>
            </CardContent>
          </Card>
          <Card className="bg-accent/5 border-accent/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-accent">{statsLoading ? '—' : stats.pending}</p>
              <p className="text-xs text-accent/80 uppercase tracking-wider mt-1">Pending</p>
            </CardContent>
          </Card>
          <Card className="bg-destructive/5 border-destructive/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-destructive">{statsLoading ? '—' : stats.rejected}</p>
              <p className="text-xs text-destructive/80 uppercase tracking-wider mt-1">Rejected</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm border-border/50">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <CreditCard className="w-8 h-8 mx-auto mb-3 opacity-20" />
                      No payment history found
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{formatDate(payment.payment_date)}</TableCell>
                      <TableCell>{payment.expand?.invoice_id?.invoice_number || '-'}</TableCell>
                      <TableCell className="font-bold">
                      <AmountText value={payment.amount} className="font-bold" />
                    </TableCell>
                      <TableCell>
                        <span
                          className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                            isPaymentApproved(payment.status)
                              ? 'bg-secondary/10 text-secondary'
                              : isPaymentRejected(payment.status)
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-accent/10 text-accent'
                          }`}
                        >
                          {payment.status}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {isPaymentRejected(payment.status) && payment.rejection_reason ? (
                          <span className="text-destructive flex items-center" title={payment.rejection_reason}>
                            <XCircle className="w-3 h-3 mr-1" /> {payment.rejection_reason}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {payment.receipt_file ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownloadReceipt(payment)}
                            className="h-8"
                          >
                            <FileImage className="w-4 h-4 mr-2" /> View
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
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

export default TenantPaymentHistoryPage;
