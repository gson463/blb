
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { formatCurrency } from '@/lib/paymentUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { logActivity } from '@/lib/activityLog';

const TenantPaymentUploadPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tenantData, setTenantData] = useState(null);
  const [unpaidInvoices, setUnpaidInvoices] = useState([]);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    invoice_id: '',
    amount: '',
    file: null
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  /** PocketBase nested expand: property id may be string or expanded record */
  const resolvePropertyId = (tenantRecord) => {
    const unit = tenantRecord?.expand?.unit_id;
    if (!unit) return null;
    const prop = unit.expand?.property_id ?? unit.property_id;
    if (typeof prop === 'string') return prop;
    if (prop && typeof prop === 'object' && prop.id) return prop.id;
    return null;
  };

  const fetchData = async () => {
    try {
      const tenantRecord = await pb.collection('tenants').getFirstListItem(`user_id = "${currentUser.id}"`, {
        expand: 'unit_id.property_id',
        $autoCancel: false
      });
      setTenantData(tenantRecord);

      const invoices = await pb.collection('invoices').getFullList({
        filter: `tenant_id = "${tenantRecord.id}" && status = "Unpaid"`,
        sort: 'due_date',
        $autoCancel: false
      });
      setUnpaidInvoices(invoices);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceChange = (val) => {
    const selected = unpaidInvoices.find(i => i.id === val);
    setFormData(prev => ({
      ...prev,
      invoice_id: val,
      amount: selected ? selected.amount.toString() : ''
    }));
    if (errors.invoice_id) setErrors(prev => ({ ...prev, invoice_id: '' }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, file: 'File size must be less than 5MB' }));
        return;
      }
      setFormData(prev => ({ ...prev, file }));
      if (errors.file) setErrors(prev => ({ ...prev, file: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.invoice_id) newErrors.invoice_id = 'Please select an invoice';
    if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = 'Valid amount is required';
    if (!formData.file) newErrors.file = 'Payment receipt is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const propertyId = resolvePropertyId(tenantData);
    if (!propertyId) {
      toast.error('Could not resolve your property. Please refresh or contact support.');
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('invoice_id', formData.invoice_id);
      data.append('tenant_id', tenantData.id);
      data.append('unit_id', tenantData.unit_id);
      data.append('property_id', propertyId);
      data.append('amount', String(parseFloat(formData.amount)));
      data.append('payment_date', new Date().toISOString());
      data.append('status', 'Pending Approval');
      data.append('receipt_file', formData.file);

      const created = await pb.collection('payments').create(data, { $autoCancel: false });
      // Invoice → Pending Approval is applied server-side (pb_hooks/payment-sync-invoice.pb.js);
      const prop = tenantData?.expand?.unit_id?.expand?.property_id;
      const landlordId =
        typeof prop === 'object' && prop?.landlord_id ? prop.landlord_id : '';
      await logActivity({
        user: currentUser,
        landlordId,
        action: 'payment.submitted',
        entity_type: 'payment',
        entity_id: created.id,
        details: `Invoice ${formData.invoice_id}`,
      });

      setSuccess(true);
      toast.success('Payment submitted successfully');
    } catch (error) {
      console.error('Error submitting payment:', error);
      const msg =
        error?.data?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'Failed to submit payment';
      toast.error(typeof msg === 'string' ? msg : 'Failed to submit payment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-md text-center">
        <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-secondary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Payment Submitted!</h2>
        <p className="text-muted-foreground mb-8">
          Your payment receipt has been uploaded and is pending approval from the landlord.
        </p>
        <div className="space-y-3">
          <Button className="w-full" onClick={() => navigate('/tenant/payment-history')}>
            View Payment History
          </Button>
          <Button variant="outline" className="w-full" onClick={() => {
            setSuccess(false);
            setFormData({ invoice_id: '', amount: '', file: null });
            fetchData();
          }}>
            Upload Another Payment
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Upload Payment - BELIBELI DIGITAL MANAGER</title>
      </Helmet>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>Upload Payment</h1>
          <p className="text-muted-foreground">Submit your bank transfer or deposit receipt.</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="bg-muted/30 border-b border-border/50">
            <CardTitle className="text-lg flex items-center">
              <Upload className="w-5 h-5 mr-2 text-primary" />
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {unpaidInvoices.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-secondary mx-auto mb-3 opacity-50" />
                <p className="font-medium">You're all caught up!</p>
                <p className="text-sm text-muted-foreground">You have no unpaid invoices at the moment.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="invoice_id">Select Invoice</Label>
                  <Select value={formData.invoice_id} onValueChange={handleInvoiceChange}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Choose an unpaid invoice" />
                    </SelectTrigger>
                    <SelectContent>
                      {unpaidInvoices.map(inv => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.invoice_number} - {formatCurrency(inv.amount)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.invoice_id && <p className="text-sm text-destructive mt-1">{errors.invoice_id}</p>}
                </div>

                <div>
                  <Label htmlFor="amount">Amount Paid (Tsh)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, amount: e.target.value }));
                      if (errors.amount) setErrors(prev => ({ ...prev, amount: '' }));
                    }}
                    className="mt-1.5"
                    placeholder="e.g. 25000"
                  />
                  {errors.amount && <p className="text-sm text-destructive mt-1">{errors.amount}</p>}
                </div>

                <div>
                  <Label htmlFor="receipt">Upload Receipt</Label>
                  <div className="mt-1.5 border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-muted/50 transition-colors">
                    <Input
                      id="receipt"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.pdf,.jpg,.jpeg,.png,.webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Label htmlFor="receipt" className="cursor-pointer flex flex-col items-center">
                      <FileText className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm font-medium text-primary hover:underline">
                        {formData.file ? formData.file.name : 'Click to browse files'}
                      </span>
                      <span className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG up to 5MB</span>
                    </Label>
                  </div>
                  {errors.file && <p className="text-sm text-destructive mt-1">{errors.file}</p>}
                </div>

                <Button type="submit" disabled={submitting} className="w-full h-12 text-base">
                  {submitting ? 'Submitting...' : 'Submit Payment'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default TenantPaymentUploadPage;
