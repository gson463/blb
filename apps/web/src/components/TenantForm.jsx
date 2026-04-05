
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { fetchAvailableUnitsForAssignment } from '@/lib/availableUnits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { generateInvoiceNumber } from '@/lib/invoiceUtils';
import { dateAtNoonEAT } from '@/lib/datetimeEAT';
import { logActivity } from '@/lib/activityLog';
import { getLandlordScopeId } from '@/lib/staffDataScope';
import { computeLeaseEndYmdFromStart } from '@/lib/leasePeriodUtils';
import {
  TZ_ID_TYPE_OPTIONS,
  getIdNumberFieldLabel,
  getIdNumberHint,
  getIdNumberPlaceholder,
  getMaxIdNumberLength,
  validateTenantIdFields,
  normalizeNidaDigits,
  NIDA_DIGIT_COUNT,
  TIN_DIGIT_COUNT,
} from '@/lib/tanzaniaId';

const TenantForm = ({ tenant, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState([]);
  const [hasActiveLease, setHasActiveLease] = useState(false);
  const [formData, setFormData] = useState({
    unit_id: '',
    name: '',
    email: '',
    phone: '',
    id_type: '',
    id_number: '',
    address: '',
    password: '',
    status: 'Active',
    lease_start_date: '',
    first_invoice_due_date: '',
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
      const d = (v) => (v ? String(v).split(' ')[0].split('T')[0] : '');
      setFormData({
        unit_id: tenant.unit_id || '',
        name: tenant.name || '',
        email: tenant.email || '',
        phone: tenant.phone || '',
        id_type: tenant.id_type || '',
        id_number: tenant.id_number || '',
        address: tenant.address || '',
        password: '',
        status: tenant.status || 'Active',
        lease_start_date: d(tenant.pending_lease_start),
        first_invoice_due_date: '',
      });
    } else {
      setFormData({
        unit_id: '',
        name: '',
        email: '',
        phone: '',
        id_type: '',
        id_number: '',
        address: '',
        password: '',
        status: 'Active',
        lease_start_date: '',
        first_invoice_due_date: '',
      });
    }
  }, [tenant, currentUser]);

  useEffect(() => {
    if (!tenant?.id) {
      setHasActiveLease(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await pb.collection('leases').getFirstListItem(
          `tenant_id = "${tenant.id}" && status = "Active"`,
          { $autoCancel: false }
        );
        if (!cancelled) setHasActiveLease(true);
      } catch {
        if (!cancelled) setHasActiveLease(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenant?.id]);

  const selectedUnit = units.find((u) => u.id === formData.unit_id);
  const computedLeaseEnd = useMemo(() => {
    const months =
      selectedUnit?.payment_period_months != null && selectedUnit.payment_period_months !== ''
        ? Number(selectedUnit.payment_period_months)
        : NaN;
    if (!formData.lease_start_date || !Number.isFinite(months) || months < 1) return '';
    return computeLeaseEndYmdFromStart(formData.lease_start_date, months);
  }, [formData.lease_start_date, formData.unit_id, selectedUnit?.payment_period_months]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleIdTypeChange = (value) => {
    const id_type = value === '_none' ? '' : value;
    setFormData((prev) => {
      let id_number = prev.id_number;
      if (id_type === 'nida') {
        id_number = normalizeNidaDigits(prev.id_number).slice(0, NIDA_DIGIT_COUNT);
      } else if (id_type === 'tin_tra') {
        id_number = normalizeNidaDigits(prev.id_number).slice(0, TIN_DIGIT_COUNT);
      }
      return { ...prev, id_type, id_number };
    });
    setErrors((prev) => ({ ...prev, id_type: '', id_number: '' }));
  };

  const handleIdNumberChange = (e) => {
    const v = e.target.value;
    setFormData((prev) => {
      if (prev.id_type === 'nida') {
        return { ...prev, id_number: normalizeNidaDigits(v).slice(0, NIDA_DIGIT_COUNT) };
      }
      if (prev.id_type === 'tin_tra') {
        return { ...prev, id_number: normalizeNidaDigits(v).slice(0, TIN_DIGIT_COUNT) };
      }
      return { ...prev, id_number: v };
    });
    if (errors.id_number) {
      setErrors((prev) => ({ ...prev, id_number: '' }));
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

    const selectedUnit = units.find((u) => u.id === formData.unit_id);
    const needsLeasePlan = !tenant || (tenant && !hasActiveLease);

    if (!tenant) {
      if (!formData.lease_start_date) newErrors.lease_start_date = 'Lease start date is required';
      if (!formData.first_invoice_due_date) {
        newErrors.first_invoice_due_date = 'First invoice due date is required';
      }
      if (!selectedUnit || selectedUnit.rent_amount == null || Number(selectedUnit.rent_amount) <= 0) {
        newErrors.unit_id = newErrors.unit_id || 'Unit must have a monthly rent set (edit the unit first)';
      }
      const pm =
        selectedUnit?.payment_period_months != null && selectedUnit.payment_period_months !== ''
          ? Number(selectedUnit.payment_period_months)
          : NaN;
      if (!selectedUnit || !Number.isFinite(pm) || pm < 1) {
        newErrors.unit_id =
          newErrors.unit_id || 'Unit must have a payment period (months) set — edit the unit first';
      }
      if (formData.lease_start_date && !computedLeaseEnd) {
        newErrors.lease_start_date =
          newErrors.lease_start_date || 'Could not derive lease end — check unit payment period';
      }
    } else if (needsLeasePlan) {
      if (!formData.lease_start_date) newErrors.lease_start_date = 'Lease start date is required';
      const pm =
        selectedUnit?.payment_period_months != null && selectedUnit.payment_period_months !== ''
          ? Number(selectedUnit.payment_period_months)
          : NaN;
      if (!selectedUnit || !Number.isFinite(pm) || pm < 1) {
        newErrors.unit_id =
          newErrors.unit_id || 'Unit must have a payment period (months) set — edit the unit first';
      }
      if (formData.lease_start_date && !computedLeaseEnd) {
        newErrors.lease_start_date =
          newErrors.lease_start_date || 'Could not derive lease end — check unit payment period';
      }
    }

    const idFieldErr = validateTenantIdFields(formData.id_type, formData.id_number);
    if (idFieldErr) {
      newErrors[idFieldErr.field] = idFieldErr.message;
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
      const idNumberStored =
        formData.id_type === 'nida' || formData.id_type === 'tin_tra'
          ? normalizeNidaDigits(formData.id_number)
          : String(formData.id_number ?? '').trim();

      const tenantData = {
        user_id: userId,
        unit_id: formData.unit_id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        id_type: formData.id_type || '',
        id_number: idNumberStored,
        address: formData.address,
        status: formData.status,
      };

      if (!tenant) {
        tenantData.pending_lease_start = formData.lease_start_date;
        tenantData.pending_lease_end = computedLeaseEnd;
      } else if (!hasActiveLease) {
        tenantData.pending_lease_start = formData.lease_start_date;
        tenantData.pending_lease_end = computedLeaseEnd;
      }

      if (tenant) {
        await pb.collection('tenants').update(tenant.id, tenantData, { $autoCancel: false });
        // Keep unit ↔ tenant in sync so tenant portal can expand unit/property (units.tenant_id must match user).
        const uid = userId;
        if (formData.unit_id !== tenant.unit_id) {
          if (tenant.unit_id) {
            try {
              await pb.collection('units').update(
                tenant.unit_id,
                { status: 'Vacant', tenant_id: '' },
                { $autoCancel: false }
              );
            } catch (e) {
              console.warn('Could not vacate previous unit', e);
            }
          }
          await pb.collection('units').update(
            formData.unit_id,
            { status: 'Occupied', tenant_id: uid },
            { $autoCancel: false }
          );
        } else {
          await pb.collection('units').update(
            formData.unit_id,
            { status: 'Occupied', tenant_id: uid },
            { $autoCancel: false }
          );
        }
        toast.success('Tenant updated successfully');
      } else {
        const createdTenant = await pb.collection('tenants').create(tenantData, { $autoCancel: false });

        await pb.collection('units').update(formData.unit_id, {
          status: 'Occupied',
          tenant_id: userId,
        }, { $autoCancel: false });

        const unit = await pb.collection('units').getOne(formData.unit_id, { expand: 'property_id', $autoCancel: false });
        const periodMonths = Number(unit.payment_period_months);
        const months =
          Number.isFinite(periodMonths) && periodMonths >= 1 ? periodMonths : 12;
        const invoiceAmount = Number(unit.rent_amount) * months;
        const invoice = await pb.collection('invoices').create(
          {
            property_id: unit.property_id,
            unit_id: unit.id,
            tenant_id: createdTenant.id,
            amount: invoiceAmount,
            due_date: dateAtNoonEAT(formData.first_invoice_due_date),
            status: 'Unpaid',
            invoice_number: generateInvoiceNumber(),
          },
          { $autoCancel: false }
        );

        const lid = getLandlordScopeId(currentUser);
        await logActivity({
          user: currentUser,
          landlordId: lid || '',
          action: 'invoice.created',
          entity_type: 'invoice',
          entity_id: invoice.id,
          details: `${invoice.invoice_number} (onboarding)`,
        });

        const credLine = `Email: ${formData.email}\nPassword: ${formData.password}`;
        toast.success('Tenant account created — first invoice added (lease activates when it is paid)', {
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
      <div className="bg-background rounded-2xl shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{tenant ? 'Edit Tenant' : 'Add Tenant'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors duration-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!tenant && (
            <p className="text-sm text-muted-foreground rounded-lg border border-border/80 bg-muted/30 px-3 py-2">
              Only <strong>vacant</strong> units appear here (set monthly rent and payment period on the unit first).
              The first <strong>invoice</strong> amount is monthly rent × payment period; the{' '}
              <strong>lease</strong> is created when that invoice is marked <strong>Paid</strong> (after payment
              approval or mark-as-paid).
            </p>
          )}
          {tenant && hasActiveLease && (
            <p className="text-xs text-muted-foreground rounded-lg border border-border/80 bg-muted/20 px-3 py-2">
              This tenant has an active lease. To change rent or dates, use <strong>Leases</strong> or{' '}
              <strong>Invoices</strong>.
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
            <Label htmlFor="id_type">ID type / Aina ya kitambulisho</Label>
            <Select value={formData.id_type || '_none'} onValueChange={handleIdTypeChange}>
              <SelectTrigger id="id_type" className="mt-1">
                <SelectValue placeholder="Select ID type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Select…</SelectItem>
                {TZ_ID_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.id_type && <p className="text-sm text-destructive mt-1">{errors.id_type}</p>}
          </div>

          <div>
            <Label htmlFor="id_number">{getIdNumberFieldLabel(formData.id_type)}</Label>
            <Input
              id="id_number"
              name="id_number"
              value={formData.id_number}
              onChange={handleIdNumberChange}
              inputMode={
                formData.id_type === 'nida' || formData.id_type === 'tin_tra' ? 'numeric' : 'text'
              }
              autoComplete="off"
              placeholder={getIdNumberPlaceholder(formData.id_type)}
              className="mt-1"
              maxLength={getMaxIdNumberLength(formData.id_type)}
            />
            {formData.id_type && getIdNumberHint(formData.id_type) && (
              <p className="text-xs text-muted-foreground mt-1">
                {getIdNumberHint(formData.id_type)}
                {formData.id_type === 'nida' && (
                  <>
                    {' '}
                    — {normalizeNidaDigits(formData.id_number).length}/{NIDA_DIGIT_COUNT}
                  </>
                )}
                {formData.id_type === 'tin_tra' && (
                  <>
                    {' '}
                    — {normalizeNidaDigits(formData.id_number).length}/{TIN_DIGIT_COUNT}
                  </>
                )}
              </p>
            )}
            {errors.id_number && <p className="text-sm text-destructive mt-1">{errors.id_number}</p>}
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

          {(!tenant || (tenant && !hasActiveLease)) && (
            <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-3">
              <p className="text-xs font-medium text-foreground">Lease period (applied when first invoice is paid)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="lease_start_date">Lease start</Label>
                  <Input
                    id="lease_start_date"
                    name="lease_start_date"
                    type="date"
                    value={formData.lease_start_date}
                    onChange={handleChange}
                    className="mt-1"
                  />
                  {errors.lease_start_date && (
                    <p className="text-sm text-destructive mt-1">{errors.lease_start_date}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lease_end_computed">Lease end (from unit payment period)</Label>
                  <Input
                    id="lease_end_computed"
                    type="date"
                    value={computedLeaseEnd}
                    readOnly
                    className="mt-1 bg-muted/50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    End date = last day of the lease term (start + unit payment period in months).
                  </p>
                </div>
              </div>
              {!tenant && (
                <div>
                  <Label htmlFor="first_invoice_due_date">First invoice due date</Label>
                  <Input
                    id="first_invoice_due_date"
                    name="first_invoice_due_date"
                    type="date"
                    value={formData.first_invoice_due_date}
                    onChange={handleChange}
                    className="mt-1"
                  />
                  {errors.first_invoice_due_date && (
                    <p className="text-sm text-destructive mt-1">{errors.first_invoice_due_date}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Invoice amount = monthly rent × unit payment period (months). Times use EAT (GMT+3).
                  </p>
                </div>
              )}
            </div>
          )}

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
