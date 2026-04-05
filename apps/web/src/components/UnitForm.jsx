
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { buildPropertiesFilter } from '@/lib/staffDataScope';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { X } from 'lucide-react';

/** Relation field can be id string or expanded object depending on API response shape */
function normalizePropertyId(u) {
  if (!u) return '';
  const pid = u.property_id;
  if (typeof pid === 'string') return pid;
  if (pid && typeof pid === 'object' && pid.id) return pid.id;
  return '';
}

function buildFormDataFromUnit(unit, propertyId) {
  if (unit) {
    const rent =
      unit.rent_amount != null && unit.rent_amount !== ''
        ? String(unit.rent_amount)
        : '';
    const ppm =
      unit.payment_period_months != null && unit.payment_period_months !== ''
        ? String(unit.payment_period_months)
        : '12';
    return {
      property_id: normalizePropertyId(unit) || propertyId || '',
      name: unit.name ?? '',
      type: unit.type || 'Apartment',
      rent_amount: rent,
      payment_period_months: ppm,
      status: unit.status || 'Vacant',
      image: null,
    };
  }
  return {
    property_id: propertyId || '',
    name: '',
    type: 'Apartment',
    rent_amount: '',
    payment_period_months: '12',
    status: 'Vacant',
    image: null,
  };
}

const UnitForm = ({ unit, propertyId, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState([]);
  const [formData, setFormData] = useState(() => buildFormDataFromUnit(unit, propertyId));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setFormData(buildFormDataFromUnit(unit, propertyId));
    setErrors({});
  }, [unit, propertyId]);

  useEffect(() => {
    const load = async () => {
      try {
        const records = await pb.collection('properties').getFullList({
          filter: buildPropertiesFilter(currentUser),
          $autoCancel: false,
        });
        const pid = normalizePropertyId(unit);
        if (pid && !records.some((p) => p.id === pid)) {
          const ex = unit?.expand?.property_id;
          if (ex && typeof ex === 'object' && ex.id) {
            setProperties([{ id: ex.id, name: ex.name || 'Property' }, ...records]);
            return;
          }
          try {
            const extra = await pb.collection('properties').getOne(pid, { $autoCancel: false });
            setProperties([extra, ...records]);
            return;
          } catch (_) {
            setProperties([{ id: pid, name: 'Current property' }, ...records]);
            return;
          }
        }
        setProperties(records);
      } catch (error) {
        console.error('Error fetching properties:', error);
      }
    };
    load();
  }, [currentUser, unit]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: files ? files[0] : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.property_id) newErrors.property_id = 'Property is required';
    if (!formData.name.trim()) newErrors.name = 'Unit name is required';
    if (!formData.rent_amount || formData.rent_amount <= 0) newErrors.rent_amount = 'Valid rent amount is required';
    const ppm = parseInt(formData.payment_period_months, 10);
    if (!Number.isFinite(ppm) || ppm < 1 || ppm > 120) {
      newErrors.payment_period_months = 'Payment period must be between 1 and 120 months';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const data = new FormData();
      data.append('property_id', formData.property_id);
      data.append('name', formData.name);
      data.append('type', formData.type);
      data.append('rent_amount', parseFloat(formData.rent_amount));
      data.append('payment_period_months', parseInt(formData.payment_period_months, 10));
      data.append('status', formData.status);
      if (formData.image) {
        data.append('image', formData.image);
      }

      if (unit) {
        await pb.collection('units').update(unit.id, data, { $autoCancel: false });
        toast.success('Unit updated successfully');
      } else {
        await pb.collection('units').create(data, { $autoCancel: false });
        toast.success('Unit created successfully');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving unit:', error);
      toast.error(error.message || 'Failed to save unit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-2xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{unit ? 'Edit Unit' : 'Add Unit'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors duration-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <Label htmlFor="property_id">Property</Label>
            <Select
              value={formData.property_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, property_id: value }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.property_id && <p className="text-sm text-destructive mt-1">{errors.property_id}</p>}
          </div>

          <div>
            <Label htmlFor="name">Unit Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Unit 2A"
              className="mt-1"
            />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label htmlFor="type">Unit Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="House">House</SelectItem>
                <SelectItem value="Apartment">Apartment</SelectItem>
                <SelectItem value="Room">Room</SelectItem>
                <SelectItem value="Shop">Shop</SelectItem>
                <SelectItem value="Plot">Plot</SelectItem>
                <SelectItem value="Office">Office</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="rent_amount">Rent/Month (Tsh)</Label>
            <Input
              id="rent_amount"
              name="rent_amount"
              type="number"
              value={formData.rent_amount}
              onChange={handleChange}
              placeholder="e.g., 25000"
              className="mt-1"
            />
            {errors.rent_amount && <p className="text-sm text-destructive mt-1">{errors.rent_amount}</p>}
          </div>

          <div>
            <Label htmlFor="payment_period_months">Payment period (months)</Label>
            <Input
              id="payment_period_months"
              name="payment_period_months"
              type="number"
              min={1}
              max={120}
              step={1}
              value={formData.payment_period_months}
              onChange={handleChange}
              placeholder="e.g., 6"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              How often rent is billed (e.g. 6 = every six months). First onboarding invoice = monthly rent × this
              number.
            </p>
            {errors.payment_period_months && (
              <p className="text-sm text-destructive mt-1">{errors.payment_period_months}</p>
            )}
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Vacant">Vacant</SelectItem>
                <SelectItem value="Occupied">Occupied</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="image">Unit Image</Label>
            <Input
              id="image"
              name="image"
              type="file"
              accept="image/*"
              onChange={handleChange}
              className="mt-1"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : unit ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UnitForm;
