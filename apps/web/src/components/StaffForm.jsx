
import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Shield, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

const StaffForm = ({ staff, onClose, onSuccess }) => {
  const isEdit = !!staff;
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState([]);
  
  const [formData, setFormData] = useState({
    name: staff?.name || '',
    email: staff?.email || '',
    phone: staff?.phone || '',
    staff_role: staff?.staff_role || 'manager',
    status: staff?.status || 'active',
    assigned_properties: staff?.assigned_properties || []
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const creator = pb.authStore.model;
      const filter =
        creator?.role === 'landlord'
          ? `landlord_id="${creator.id}"`
          : creator?.role === 'staff' && creator?.employer_id
            ? `landlord_id="${creator.employer_id}"`
            : '';
      const records = await pb.collection('properties').getFullList({
        ...(filter ? { filter } : {}),
        sort: 'name',
        $autoCancel: false
      });
      setProperties(records);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast.error('Failed to load properties');
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

  const handlePropertyToggle = (propertyId) => {
    setFormData(prev => {
      const current = prev.assigned_properties;
      const updated = current.includes(propertyId)
        ? current.filter(id => id !== propertyId)
        : [...current, propertyId];
      return { ...prev, assigned_properties: updated };
    });
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.staff_role) newErrors.staff_role = 'Role is required';
    
    if (formData.staff_role === 'collector' && formData.assigned_properties.length === 0) {
      newErrors.assigned_properties = 'Collectors must be assigned to at least one property';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const dataToSubmit = {
        ...formData,
        role: 'staff',
        emailVisibility: true
      };

      if (formData.staff_role !== 'collector') {
        dataToSubmit.assigned_properties = [];
      }

      if (isEdit) {
        // Don't update email on edit to avoid auth complications unless necessary
        delete dataToSubmit.email;
        await pb.collection('users').update(staff.id, dataToSubmit, { $autoCancel: false });
        toast.success('Staff member updated successfully');
      } else {
        const tempPassword = generatePassword();
        dataToSubmit.password = tempPassword;
        dataToSubmit.passwordConfirm = tempPassword;
        const creator = pb.authStore.model;
        if (creator?.role === 'landlord') {
          dataToSubmit.employer_id = creator.id;
        }

        await pb.collection('users').create(dataToSubmit, { $autoCancel: false });
        
        toast.success('Staff created successfully!', {
          description: `Password: ${tempPassword} (Please save this!)`,
          duration: 10000,
        });
      }
      
      onSuccess();
    } catch (error) {
      console.error('Error saving staff:', error);
      toast.error(error.response?.message || 'Failed to save staff member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <h2 className="text-xl font-bold flex items-center">
            <Shield className="w-5 h-5 mr-2 text-primary" />
            {isEdit ? 'Edit Staff Member' : 'Add New Staff'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="staff-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="mt-1.5"
                placeholder="e.g. Jane Doe"
              />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled={isEdit}
                className="mt-1.5"
                placeholder="jane@example.com"
              />
              {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
              {isEdit && <p className="text-xs text-muted-foreground mt-1">Email cannot be changed after creation.</p>}
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="mt-1.5"
                placeholder="e.g. +254 700 000000"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="staff_role">Role</Label>
                <Select value={formData.staff_role} onValueChange={(v) => handleSelectChange('staff_role', v)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="accountant">Accountant</SelectItem>
                    <SelectItem value="collector">Collector</SelectItem>
                  </SelectContent>
                </Select>
                {errors.staff_role && <p className="text-sm text-destructive mt-1">{errors.staff_role}</p>}
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => handleSelectChange('status', v)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.staff_role === 'collector' && (
              <div className="pt-2 border-t border-border/50">
                <Label className="mb-2 block">Assigned Properties</Label>
                <p className="text-xs text-muted-foreground mb-3">Select properties this collector can manage.</p>
                <ScrollArea className="h-40 rounded-md border border-input p-3">
                  {properties.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No properties available</p>
                  ) : (
                    <div className="space-y-3">
                      {properties.map(property => (
                        <div key={property.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`prop-${property.id}`} 
                            checked={formData.assigned_properties.includes(property.id)}
                            onCheckedChange={() => handlePropertyToggle(property.id)}
                          />
                          <label 
                            htmlFor={`prop-${property.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {property.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                {errors.assigned_properties && <p className="text-sm text-destructive mt-1">{errors.assigned_properties}</p>}
              </div>
            )}

            {!isEdit && (
              <div className="bg-muted/50 p-3 rounded-lg flex items-start space-x-3 mt-4">
                <KeyRound className="w-5 h-5 text-muted-foreground mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A secure password will be automatically generated and displayed after creation. Please ensure you copy it and share it securely with the staff member.
                </p>
              </div>
            )}
          </form>
        </div>

        <div className="p-6 border-t border-border/50 bg-muted/10 flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="staff-form" disabled={loading}>
            {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Staff'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StaffForm;
