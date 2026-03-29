
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import {
  buildPropertiesFilter,
  buildTenantsFilter,
  buildUnitsFilter,
  getLandlordScopeId,
} from '@/lib/staffDataScope';
import { generateInvoiceNumber } from '@/lib/invoiceUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { logActivity } from '@/lib/activityLog';

const InvoiceForm = ({ invoice, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  
  const [formData, setFormData] = useState({
    property_id: '',
    unit_id: '',
    tenant_id: '',
    amount: '',
    due_date: '',
    status: 'Unpaid'
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchInitialData();
    if (invoice) {
      setFormData({
        property_id: invoice.property_id || '',
        unit_id: invoice.unit_id || '',
        tenant_id: invoice.tenant_id || '',
        amount: invoice.amount || '',
        due_date: invoice.due_date ? invoice.due_date.split(' ')[0] : '',
        status: invoice.status || 'Unpaid'
      });
    }
  }, [invoice]);

  const fetchInitialData = async () => {
    try {
      const pf = buildPropertiesFilter(currentUser);
      const uf = buildUnitsFilter(currentUser);
      const tf = buildTenantsFilter(currentUser);
      const [propsRes, unitsRes, tenantsRes] = await Promise.all([
        pb.collection('properties').getFullList({ filter: pf, $autoCancel: false }),
        pb.collection('units').getFullList({ filter: uf, expand: 'property_id', $autoCancel: false }),
        pb.collection('tenants').getFullList({ filter: tf, expand: 'unit_id', $autoCancel: false })
      ]);
      setProperties(propsRes);
      setUnits(unitsRes);
      setTenants(tenantsRes);
    } catch (error) {
      console.error('Error fetching form data:', error);
      toast.error('Failed to load form options');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSelectChange = async (name, value) => {
    if (name === 'property_id') {
      setFormData((prev) => ({
        ...prev,
        property_id: value,
        unit_id: '',
        tenant_id: '',
        amount: '',
      }));
      if (errors.property_id) setErrors((prev) => ({ ...prev, property_id: '' }));
      return;
    }
    if (name === 'unit_id') {
      const tenant = tenants.find((t) => t.unit_id === value);
      let amountStr = '';
      if (tenant?.id) {
        try {
          const lease = await pb.collection('leases').getFirstListItem(
            `tenant_id = "${tenant.id}" && status = "Active"`,
            { $autoCancel: false }
          );
          if (lease?.rent_amount != null) {
            amountStr = String(lease.rent_amount);
          }
        } catch {
          /* no active lease */
        }
      }
      setFormData((prev) => ({
        ...prev,
        unit_id: value,
        tenant_id: tenant?.id || '',
        amount: amountStr || prev.amount,
      }));
      if (errors.unit_id) setErrors((prev) => ({ ...prev, unit_id: '' }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.property_id) newErrors.property_id = 'Property is required';
    if (!formData.unit_id) newErrors.unit_id = 'Unit is required';
    if (!formData.tenant_id) newErrors.tenant_id = 'Tenant is required';
    if (!formData.amount || formData.amount <= 0) newErrors.amount = 'Valid amount is required';
    if (!formData.due_date) newErrors.due_date = 'Due date is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const data = {
        property_id: formData.property_id,
        unit_id: formData.unit_id,
        tenant_id: formData.tenant_id,
        amount: parseFloat(formData.amount),
        due_date: `${formData.due_date} 12:00:00.000Z`,
        status: formData.status
      };

      if (invoice) {
        await pb.collection('invoices').update(invoice.id, data, { $autoCancel: false });
        toast.success('Invoice updated successfully');
        await logActivity({
          user: currentUser,
          landlordId: getLandlordScopeId(currentUser) || '',
          action: 'invoice.updated',
          entity_type: 'invoice',
          entity_id: invoice.id,
          details: invoice.invoice_number,
        });
      } else {
        data.invoice_number = generateInvoiceNumber();
        const created = await pb.collection('invoices').create(data, { $autoCancel: false });
        toast.success('Invoice created successfully');
        await logActivity({
          user: currentUser,
          landlordId: getLandlordScopeId(currentUser) || '',
          action: 'invoice.created',
          entity_type: 'invoice',
          entity_id: created.id,
          details: data.invoice_number,
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error(error.message || 'Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  const filteredUnits = formData.property_id 
    ? units.filter(u => u.property_id === formData.property_id)
    : units;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-2xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold">{invoice ? 'Edit Invoice' : 'Create Invoice'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors duration-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <Label htmlFor="property_id">Property</Label>
            <Select value={formData.property_id} onValueChange={(v) => handleSelectChange('property_id', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.property_id && <p className="text-sm text-destructive mt-1">{errors.property_id}</p>}
          </div>

          <div>
            <Label htmlFor="unit_id">Unit</Label>
            <Select value={formData.unit_id} onValueChange={(v) => handleSelectChange('unit_id', v)} disabled={!formData.property_id}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {filteredUnits.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.unit_id && <p className="text-sm text-destructive mt-1">{errors.unit_id}</p>}
          </div>

          <div>
            <Label htmlFor="tenant_id">Tenant</Label>
            <Select value={formData.tenant_id} onValueChange={(v) => handleSelectChange('tenant_id', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select tenant" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.tenant_id && <p className="text-sm text-destructive mt-1">{errors.tenant_id}</p>}
          </div>

          <div>
            <Label htmlFor="amount">Amount (Tsh)</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              value={formData.amount}
              onChange={handleChange}
              placeholder="e.g. 25000"
              className="mt-1"
            />
            {errors.amount && <p className="text-sm text-destructive mt-1">{errors.amount}</p>}
          </div>

          <div>
            <Label htmlFor="due_date">Due Date</Label>
            <Input
              id="due_date"
              name="due_date"
              type="date"
              value={formData.due_date}
              onChange={handleChange}
              className="mt-1"
            />
            {errors.due_date && <p className="text-sm text-destructive mt-1">{errors.due_date}</p>}
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(v) => handleSelectChange('status', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Unpaid">Unpaid</SelectItem>
                <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : invoice ? 'Update Invoice' : 'Create Invoice'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InvoiceForm;
