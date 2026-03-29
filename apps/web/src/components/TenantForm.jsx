
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { fetchAvailableUnitsForAssignment } from '@/lib/availableUnits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { X } from 'lucide-react';

const TenantForm = ({ tenant, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState([]);
  const [formData, setFormData] = useState({
    unit_id: '',
    name: '',
    email: '',
    phone: '',
    id_number: '',
    address: '',
    password: '',
    status: 'Active'
  });
  const [errors, setErrors] = useState({});

  const fetchUnits = async () => {
    try {
      const records = await fetchAvailableUnitsForAssignment(pb, currentUser, {
        editingUnitId: tenant?.unit_id || undefined,
      });
      setUnits(records);
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  useEffect(() => {
    fetchUnits();
    if (tenant) {
      setFormData({
        unit_id: tenant.unit_id || '',
        name: tenant.name || '',
        email: tenant.email || '',
        phone: tenant.phone || '',
        id_number: tenant.id_number || '',
        address: tenant.address || '',
        password: '',
        status: tenant.status || 'Active'
      });
    }
  }, [tenant, currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.unit_id) newErrors.unit_id = 'Unit is required';
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!tenant && !formData.password) newErrors.password = 'Password is required';
    if (!tenant && formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      let userId = tenant?.user_id;

      // Create user account if new tenant
      if (!tenant) {
        const previousOnUnit = await pb.collection('tenants').getFullList({
          filter: `unit_id = "${formData.unit_id}" && status = "Active"`,
          $autoCancel: false,
        });
        for (const ex of previousOnUnit) {
          await pb.collection('tenants').update(ex.id, { status: 'Inactive' }, { $autoCancel: false });
        }

        const userRecord = await pb.collection('users').create({
          email: formData.email,
          password: formData.password,
          passwordConfirm: formData.password,
          name: formData.name,
          role: 'tenant',
          phone: formData.phone,
          status: 'active',
          emailVisibility: true
        }, { $autoCancel: false });
        userId = userRecord.id;
      }

      // Create or update tenant record
      const tenantData = {
        user_id: userId,
        unit_id: formData.unit_id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        id_number: formData.id_number,
        address: formData.address,
        status: formData.status
      };

      if (tenant) {
        await pb.collection('tenants').update(tenant.id, tenantData, { $autoCancel: false });
        toast.success('Tenant updated successfully');
      } else {
        await pb.collection('tenants').create(tenantData, { $autoCancel: false });
        
        // Update unit status to Occupied
        await pb.collection('units').update(formData.unit_id, {
          status: 'Occupied',
          tenant_id: userId
        }, { $autoCancel: false });

        const credLine = `Email: ${formData.email}\nPassword: ${formData.password}`;
        toast.success('Tenant account created', {
          description: 'Send these portal login details to the tenant.',
          action: {
            label: 'Copy credentials',
            onClick: () => {
              navigator.clipboard.writeText(credLine).then(
                () => toast.message('Copied to clipboard'),
                () => toast.error('Could not copy')
              );
            },
          },
          duration: 12000,
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving tenant:', error);
      toast.error(error.message || 'Failed to save tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-2xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{tenant ? 'Edit Tenant' : 'Add Tenant'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors duration-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!tenant && (
            <p className="text-sm text-muted-foreground rounded-lg border border-border/80 bg-muted/30 px-3 py-2">
              Create the tenant&apos;s login here. Assign a <strong>vacant</strong> unit or one whose{' '}
              <strong>lease has ended</strong> (no active lease). Previous active tenants on that unit are marked
              inactive when you save.
            </p>
          )}
          <div>
            <Label htmlFor="unit_id">Assign Unit</Label>
            <Select
              value={formData.unit_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, unit_id: value }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {units.map((unit) => {
                  const label = `${unit.expand?.property_id?.name || 'Property'} — ${unit.name}`;
                  const hint = unit.availabilityLabel ? ` (${unit.availabilityLabel})` : '';
                  return (
                    <SelectItem key={unit.id} value={unit.id}>
                      {label}
                      {hint}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {errors.unit_id && <p className="text-sm text-destructive mt-1">{errors.unit_id}</p>}
          </div>

          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Maya Chen"
              className="mt-1"
            />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="tenant@example.com"
              className="mt-1"
            />
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
          </div>

          {!tenant && (
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 8 characters"
                className="mt-1"
              />
              {errors.password && <p className="text-sm text-destructive mt-1">{errors.password}</p>}
            </div>
          )}

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+254 700 000 000"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="id_number">ID Number</Label>
            <Input
              id="id_number"
              name="id_number"
              value={formData.id_number}
              onChange={handleChange}
              placeholder="National ID or Passport"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Physical address"
              className="mt-1"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : tenant ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TenantForm;
