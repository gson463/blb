
import React, { useState } from 'react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { formatCurrency } from '@/lib/invoiceUtils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import PaymentReceiptViewer from './PaymentReceiptViewer.jsx';
import { toast } from 'sonner';
import { X, CheckCircle, XCircle } from 'lucide-react';

const PaymentApprovalModal = ({ payment, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [actionType, setActionType] = useState(null); // 'approve' or 'reject'

  if (!payment) return null;

  const handleAction = async () => {
    if (actionType === 'reject' && !notes.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0] + ' 12:00:00.000Z';
      
      if (actionType === 'approve') {
        // Update payment
        await pb.collection('payments').update(payment.id, {
          status: 'Approved',
          approved_by: currentUser.name || currentUser.email,
          approval_date: today,
          rejection_reason: notes // Using DB schema field for notes
        }, { $autoCancel: false });

        // Update invoice
        if (payment.invoice_id) {
          await pb.collection('invoices').update(payment.invoice_id, {
            status: 'Paid'
          }, { $autoCancel: false });
        }
        
        toast.success('Payment approved successfully');
      } else {
        // Reject payment
        await pb.collection('payments').update(payment.id, {
          status: 'Rejected',
          rejection_reason: notes,
          approved_by: currentUser.name || currentUser.email,
          approval_date: today
        }, { $autoCancel: false });
        
        toast.success('Payment rejected');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error(`Error ${actionType}ing payment:`, error);
      toast.error(`Failed to ${actionType} payment`);
    } finally {
      setLoading(false);
      setActionType(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-background rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/10">
          <h2 className="text-xl font-semibold">Review Payment</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Details Column */}
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Payment Details</h3>
                <div className="bg-muted/20 rounded-xl p-4 space-y-3 border">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Tenant</span>
                    <span className="font-medium">{payment.expand?.tenant_id?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Invoice #</span>
                    <span className="font-medium">{payment.expand?.invoice_id?.invoice_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Date</span>
                    <span className="font-medium">{new Date(payment.payment_date).toLocaleDateString()}</span>
                  </div>
                  <div className="pt-3 mt-3 border-t flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Amount</span>
                    <span className="text-xl font-bold text-primary">{formatCurrency(payment.amount)}</span>
                  </div>
                </div>
              </div>

              {actionType && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-200">
                  <Label htmlFor="notes" className={actionType === 'reject' ? 'text-destructive' : ''}>
                    {actionType === 'reject' ? 'Reason for Rejection (Required)' : 'Approval Notes (Optional)'}
                  </Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={actionType === 'reject' ? "Explain why this payment is rejected..." : "Add any internal notes..."}
                    className={`mt-2 ${actionType === 'reject' ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    rows={3}
                  />
                  <div className="flex space-x-3 mt-4">
                    <Button variant="outline" onClick={() => setActionType(null)} className="flex-1">
                      Back
                    </Button>
                    <Button 
                      onClick={handleAction} 
                      disabled={loading} 
                      variant={actionType === 'reject' ? 'destructive' : 'default'}
                      className="flex-1"
                    >
                      {loading ? 'Processing...' : `Confirm ${actionType === 'approve' ? 'Approval' : 'Rejection'}`}
                    </Button>
                  </div>
                </div>
              )}

              {!actionType && (
                <div className="flex space-x-3 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                    onClick={() => setActionType('reject')}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button 
                    className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                    onClick={() => setActionType('approve')}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </div>
              )}
            </div>

            {/* Receipt Column */}
            <div className="flex flex-col h-full">
              <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Receipt Document</h3>
              <PaymentReceiptViewer 
                record={payment} 
                filename={payment.receipt_file} 
                className="flex-1 min-h-[300px]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentApprovalModal;
