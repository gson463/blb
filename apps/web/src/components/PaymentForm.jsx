
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { buildInvoicesFilter } from '@/lib/staffDataScope';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/paymentUtils';
import { dateAtNoonEAT, todayDateStringEAT } from '@/lib/datetimeEAT';
import { X, Upload } from 'lucide-react';

const PaymentForm = ({ payment, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  
  const [formData, setFormData] = useState({
    invoice_id: '',
    tenant_id: '',
    unit_id: '',
    property_id: '',
    amount: '',
    payment_date: todayDateStringEAT(),
    payment_method: 'bank',
    notes: '',
    receipt_file: null
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchInvoices();
    if (payment) {
      setFormData({
        invoice_id: payment.invoice_id || '',
        tenant_id: payment.tenant_id || '',
        unit_id: payment.unit_id || '',
        property_id: payment.property_id || '',
        amount: payment.amount || '',
        payment_date: payment.payment_date ? payment.payment_date.split(' ')[0].split('T')[0] : todayDateStringEAT(),
        payment_method: payment.payment_method || 'bank',
        notes: payment.notes || '',
        receipt_file: null
      });
    }
  }, [payment]);

  const fetchInvoices = async () => {
    try {
      const scope = buildInvoicesFilter(currentUser);
      const records = await pb.collection('invoices').getFullList({
        filter: `(${scope}) && status != "Paid"`,
        expand: 'tenant_id,unit_id,property_id',
        sort: '-created',
        $autoCancel: false
      });
      setInvoices(records);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    }
  };

  const handleInvoiceChange = (invoiceId) => {
    const selected = invoices.find(inv => inv.id === invoiceId);
    if (selected) {
      setFormData(prev => ({
        ...prev,
        invoice_id: invoiceId,
        tenant_id: selected.tenant_id,
        unit_id: selected.unit_id,
        property_id: selected.property_id,
        amount: selected.amount
      }));
      setErrors(prev => ({ ...prev, invoice_id: '', amount: '' }));
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'receipt_file' && files && files.length > 0) {
      const file = files[0];
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, receipt_file: 'File size must be less than 5MB' }));
        return;
      }
      setFormData(prev => ({ ...prev, receipt_file: file }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.invoice_id) newErrors.invoice_id = 'Invoice is required';
    if (!formData.amount || formData.amount <= 0) newErrors.amount = 'Valid amount is required';
    if (!formData.payment_date) newErrors.payment_date = 'Payment date is required';
    if (!payment && !formData.receipt_file) newErrors.receipt_file = 'Receipt file is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const data = new FormData();
      data.append('invoice_id', formData.invoice_id);
      data.append('tenant_id', formData.tenant_id);
      data.append('unit_id', formData.unit_id);
      data.append('property_id', formData.property_id);
      data.append('amount', parseFloat(formData.amount));
      data.append('payment_date', dateAtNoonEAT(formData.payment_date));
      data.append('status', 'Pending Approval'); // Using DB schema value
      
      // Append optional fields if they exist in schema (handling gracefully)
      if (formData.payment_method) data.append('payment_method', formData.payment_method);
      if (formData.notes) data.append('notes', formData.notes);
      
      if (formData.receipt_file) {
        data.append('receipt_file', formData.receipt_file);
      }

      if (payment) {
        await pb.collection('payments').update(payment.id, data, { $autoCancel: false });
        toast.success('Payment updated successfully');
      } else {
        await pb.collection('payments').create(data, { $autoCancel: false });
        toast.success('Payment recorded and pending approval');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving payment:', error);
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-2xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold">{payment ? 'Edit Payment' : 'Record Payment'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors duration-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <Label htmlFor="invoice_id">Select Invoice</Label>
            <Select value={formData.invoice_id} onValueChange={handleInvoiceChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose an unpaid invoice" />
              </SelectTrigger>
              <SelectContent>
                {invoices.map(inv => (
                  <SelectItem key={inv.id} value={inv.id}>
                    <span className="text-amount">
                      {inv.invoice_number} - {inv.expand?.tenant_id?.name} ({formatCurrency(inv.amount)})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.invoice_id && <p className="text-sm text-destructive mt-1">{errors.invoice_id}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Amount Paid (Tsh)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                value={formData.amount}
                onChange={handleChange}
                className="mt-1"
              />
              {errors.amount && <p className="text-sm text-destructive mt-1">{errors.amount}</p>}
            </div>
            <div>
              <Label htmlFor="payment_date">Payment Date</Label>
              <Input
                id="payment_date"
                name="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={handleChange}
                className="mt-1"
              />
              {errors.payment_date && <p className="text-sm text-destructive mt-1">{errors.payment_date}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="payment_method">Payment Method</Label>
            <Select value={formData.payment_method} onValueChange={(v) => setFormData(prev => ({...prev, payment_method: v}))}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">Bank Transfer</SelectItem>
                <SelectItem value="mobile">Mobile Money</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="receipt_file">Receipt Document</Label>
            <div className="mt-1 flex items-center justify-center w-full">
              <label htmlFor="receipt_file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {formData.receipt_file ? formData.receipt_file.name : 'Click to upload receipt (Max 5MB)'}
                  </p>
                </div>
                <input 
                  id="receipt_file" 
                  name="receipt_file" 
                  type="file" 
                  className="hidden" 
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleChange}
                />
              </label>
            </div>
            {errors.receipt_file && <p className="text-sm text-destructive mt-1">{errors.receipt_file}</p>}
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any additional details..."
              className="mt-1"
              rows={2}
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Submitting...' : 'Submit Payment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentForm;
