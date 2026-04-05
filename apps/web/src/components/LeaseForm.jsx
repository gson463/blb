
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { buildPropertiesFilter, buildTenantsFilter, buildUnitsFilter } from '@/lib/staffDataScope';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { logActivity } from '@/lib/activityLog';
import { dateAtNoonEAT } from '@/lib/datetimeEAT';

const LeaseForm = ({ lease, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  
  const [formData, setFormData] = useState({
    property_id: '',
    unit_id: '',
    tenant_id: '',
    start_date: '',
    end_date: '',
    rent_amount: '',
    status: 'Active'
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchInitialData();
    if (lease) {
      setFormData({
        property_id: lease.property_id || '',
        unit_id: lease.unit_id || '',
        tenant_id: lease.tenant_id || '',
        start_date: lease.start_date ? lease.start_date.split(' ')[0] : '',
        end_date: lease.end_date ? lease.end_date.split(' ')[0] : '',
        rent_amount: lease.rent_amount || '',
        status: lease.status || 'Active'
      });
    }
  }, [lease]);

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

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.property_id) newErrors.property_id = 'Property is required';
    if (!formData.unit_id) newErrors.unit_id = 'Unit is required';
    if (!formData.tenant_id) newErrors.tenant_id = 'Tenant is required';
    if (!formData.start_date) newErrors.start_date = 'Start date is required';
    if (!formData.end_date) newErrors.end_date = 'End date is required';
    if (formData.start_date && formData.end_date && new Date(formData.end_date) <= new Date(formData.start_date)) {
      newErrors.end_date = 'End date must be after start date';
    }
    if (!formData.rent_amount || formData.rent_amount <= 0) newErrors.rent_amount = 'Valid rent amount is required';
    
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
        start_date: dateAtNoonEAT(formData.start_date),
        end_date: dateAtNoonEAT(formData.end_date),
        rent_amount: parseFloat(formData.rent_amount),
        status: formData.status
      };

      const lid =
        currentUser.role === 'landlord'
          ? currentUser.id
          : currentUser.employer_id || '';
      if (lease) {
        await pb.collection('leases').update(lease.id, data, { $autoCancel: false });
        toast.success('Lease updated successfully');
        await logActivity({
          user: currentUser,
          landlordId: lid,
          action: 'lease.updated',
          entity_type: 'lease',
          entity_id: lease.id,
          details: `${formData.start_date} → ${formData.end_date}`,
        });
      } else {
        const created = await pb.collection('leases').create(data, { $autoCancel: false });
        toast.success('Lease created successfully');
        await logActivity({
          user: currentUser,
          landlordId: lid,
          action: 'lease.created',
          entity_type: 'lease',
          entity_id: created.id,
          details: `${formData.start_date} → ${formData.end_date}`,
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving lease:', error);
      toast.error(error.message || 'Failed to save lease');
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
          <h2 className="text-xl font-semibold">{lease ? 'Edit Lease' : 'Create Lease'}</h2>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                value={formData.start_date}
                onChange={handleChange}
                className="mt-1"
              />
              {errors.start_date && <p className="text-sm text-destructive mt-1">{errors.start_date}</p>}
            </div>
            <div>
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                name="end_date"
                type="date"
                value={formData.end_date}
                onChange={handleChange}
                className="mt-1"
              />
              {errors.end_date && <p className="text-sm text-destructive mt-1">{errors.end_date}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="rent_amount">Monthly Rent (Tsh)</Label>
            <Input
              id="rent_amount"
              name="rent_amount"
              type="number"
              value={formData.rent_amount}
              onChange={handleChange}
              placeholder="e.g. 25000"
              className="mt-1"
            />
            {errors.rent_amount && <p className="text-sm text-destructive mt-1">{errors.rent_amount}</p>}
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(v) => handleSelectChange('status', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Expired">Expired</SelectItem>
                <SelectItem value="Renewed">Renewed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : lease ? 'Update Lease' : 'Create Lease'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaseForm;
