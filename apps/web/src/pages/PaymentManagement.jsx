
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { buildPaymentsFilter } from '@/lib/staffDataScope';
import { generatePaymentReport, formatDate } from '@/lib/paymentUtils';
import { todayDateStringEAT } from '@/lib/datetimeEAT';
import { AmountText } from '@/components/AmountText.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import AppShell from '@/components/AppShell.jsx';
import PaymentForm from '@/components/PaymentForm.jsx';
import PaymentApprovalModal from '@/components/PaymentApprovalModal.jsx';
import { Plus, Search, Download, CheckCircle, XCircle, Clock, FileImage, FileDown } from 'lucide-react';
import { downloadPaymentReceiptPdf } from '@/lib/pdfUtils';
import { toast } from 'sonner';

const PaymentManagement = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  
  const [showForm, setShowForm] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const records = await pb.collection('payments').getFullList({
        filter: buildPaymentsFilter(currentUser),
        expand: 'tenant_id,invoice_id,unit_id,property_id',
        sort: '-created',
        $autoCancel: false
      });
      setPayments(records);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (payment) => {
    setSelectedPayment(payment);
    setShowApprovalModal(true);
  };

  const handleResubmit = (payment) => {
    setSelectedPayment(payment);
    setShowForm(true);
  };

  const handleDownloadReceipt = async (payment) => {
    try {
      await downloadPaymentReceiptPdf(payment, {
        property_id: payment.expand?.property_id,
        unit_id: payment.expand?.unit_id,
        tenant_id: payment.expand?.tenant_id,
        invoice_id: payment.expand?.invoice_id,
      });
      toast.success('Receipt PDF downloaded');
    } catch (e) {
      console.error(e);
      toast.error('Could not generate receipt PDF');
    }
  };

  const handleExport = () => {
    try {
      const csv = generatePaymentReport(payments, 'csv');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `payments_export_${todayDateStringEAT()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Export downloaded successfully');
    } catch (error) {
      toast.error('Failed to generate export');
    }
  };

  const filteredPayments = payments.filter(p => {
    const matchesSearch = 
      p.expand?.tenant_id?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.expand?.invoice_id?.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (activeTab === 'pending') return p.status === 'Pending Approval' || p.status === 'pending_approval';
    if (activeTab === 'approved') return p.status === 'Approved' || p.status === 'approved';
    if (activeTab === 'rejected') return p.status === 'Rejected' || p.status === 'rejected';
    return true;
  });

  return (
    <>
      <Helmet>
        <title>Payment Management - BELIBELI DIGITAL MANAGER</title>
        <meta name="description" content="Review, approve, and manage tenant rent payments." />
      </Helmet>
      <AppShell>
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>Payment Management</h1>
                <p className="text-muted-foreground">Review and approve tenant payments</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button onClick={() => { setSelectedPayment(null); setShowForm(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Record Payment
                </Button>
              </div>
            </div>

            <Card className="mb-8">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Search by tenant name or invoice number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 max-w-md"
                  />
                </div>
              </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="pending" className="relative">
                  Pending
                  {payments.filter(p => p.status === 'Pending Approval').length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full"></span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="m-0">
                <Card>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Tenant / Unit</TableHead>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Receipt</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                        ) : filteredPayments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                              <Clock className="w-8 h-8 mx-auto mb-3 opacity-50" />
                              No pending payments to review
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredPayments.map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell>{formatDate(payment.payment_date)}</TableCell>
                              <TableCell>
                                <div className="font-medium">{payment.expand?.tenant_id?.name}</div>
                                <div className="text-xs text-muted-foreground">{payment.expand?.unit_id?.name}</div>
                              </TableCell>
                              <TableCell>{payment.expand?.invoice_id?.invoice_number}</TableCell>
                              <TableCell className="font-medium">
                                <AmountText value={payment.amount} />
                              </TableCell>
                              <TableCell>
                                {payment.receipt_file ? (
                                  <div className="flex items-center text-sm text-primary">
                                    <FileImage className="w-4 h-4 mr-1" /> Attached
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">None</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" onClick={() => handleReview(payment)}>
                                  Review
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="approved" className="m-0">
                <Card>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Tenant</TableHead>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Approved By</TableHead>
                          <TableHead>Approval Date</TableHead>
                          <TableHead className="text-right">Receipt</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
                        ) : filteredPayments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                              <CheckCircle className="w-8 h-8 mx-auto mb-3 opacity-50" />
                              No approved payments found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredPayments.map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell>{formatDate(payment.payment_date)}</TableCell>
                              <TableCell className="font-medium">{payment.expand?.tenant_id?.name}</TableCell>
                              <TableCell>{payment.expand?.invoice_id?.invoice_number}</TableCell>
                              <TableCell className="font-medium">
                                <AmountText value={payment.amount} />
                              </TableCell>
                              <TableCell>{payment.approved_by || '-'}</TableCell>
                              <TableCell>{formatDate(payment.approval_date)}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownloadReceipt(payment)}
                                >
                                  <FileDown className="w-4 h-4 mr-1" />
                                  PDF
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="rejected" className="m-0">
                <Card>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Tenant</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                        ) : filteredPayments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                              <XCircle className="w-8 h-8 mx-auto mb-3 opacity-50" />
                              No rejected payments found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredPayments.map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell>{formatDate(payment.payment_date)}</TableCell>
                              <TableCell className="font-medium">{payment.expand?.tenant_id?.name}</TableCell>
                              <TableCell className="font-medium">
                                <AmountText value={payment.amount} />
                              </TableCell>
                              <TableCell className="max-w-xs truncate" title={payment.rejection_reason}>
                                {payment.rejection_reason || 'No reason provided'}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="outline" size="sm" onClick={() => handleResubmit(payment)}>
                                  Resubmit
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </AppShell>

      {showForm && (
        <PaymentForm
          payment={selectedPayment}
          onClose={() => { setShowForm(false); setSelectedPayment(null); }}
          onSuccess={fetchPayments}
        />
      )}

      {showApprovalModal && (
        <PaymentApprovalModal
          payment={selectedPayment}
          onClose={() => { setShowApprovalModal(false); setSelectedPayment(null); }}
          onSuccess={fetchPayments}
        />
      )}
    </>
  );
};

export default PaymentManagement;
