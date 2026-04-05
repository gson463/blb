
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { buildPropertiesFilter, buildUnitsFilter } from '@/lib/staffDataScope';
import { downloadCsv, parseCsv } from '@/lib/csvUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppShell from '@/components/AppShell.jsx';
import UnitForm from '@/components/UnitForm.jsx';
import { Plus, Home, Edit, Trash2, MapPin, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { AmountText } from '@/components/AmountText.jsx';

const UNIT_TYPES = new Set(['House', 'Apartment', 'Room', 'Shop', 'Plot', 'Office']);
const UNIT_STATUSES = new Set(['Vacant', 'Occupied']);

const UnitManagement = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState([]);
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedIds, setSelectedIds] = useState({});
  const importInputRef = useRef(null);

  const fetchProperties = useCallback(async () => {
    try {
      const records = await pb.collection('properties').getFullList({
        filter: buildPropertiesFilter(currentUser),
        $autoCancel: false
      });
      setProperties(records);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  }, [currentUser]);

  const fetchUnits = useCallback(async () => {
    try {
      const records = await pb.collection('units').getFullList({
        filter: buildUnitsFilter(currentUser),
        expand: 'property_id',
        sort: '-created',
        $autoCancel: false
      });
      setUnits(records);
    } catch (error) {
      console.error('Error fetching units:', error);
      toast.error('Failed to load units');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.id) return;
    fetchProperties();
    fetchUnits();
  }, [currentUser?.id, fetchProperties, fetchUnits]);

  const handleEdit = async (unit) => {
    try {
      const fresh = await pb.collection('units').getOne(unit.id, { $autoCancel: false });
      setSelectedUnit(fresh);
    } catch (e) {
      console.error(e);
      setSelectedUnit(unit);
    }
    setShowForm(true);
  };

  const handleDelete = async (unitId) => {
    if (!window.confirm('Are you sure you want to delete this unit?')) return;

    try {
      await pb.collection('units').delete(unitId, { $autoCancel: false });
      toast.success('Unit deleted successfully');
      fetchUnits();
    } catch (error) {
      console.error('Error deleting unit:', error);
      toast.error('Failed to delete unit');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredUnits = selectedProperty === 'all'
    ? units
    : units.filter((unit) => unit.property_id === selectedProperty);

  const selectAllFiltered = () => {
    const next = { ...selectedIds };
    filteredUnits.forEach((u) => {
      next[u.id] = true;
    });
    setSelectedIds(next);
  };

  const clearSelection = () => setSelectedIds({});

  const selectedCount = Object.values(selectedIds).filter(Boolean).length;

  const handleBulkDelete = async () => {
    const ids = Object.entries(selectedIds)
      .filter(([, v]) => v)
      .map(([id]) => id);
    if (!ids.length) {
      toast.message('Select one or more units first');
      return;
    }
    if (!window.confirm(`Delete ${ids.length} unit${ids.length === 1 ? '' : 's'}?`)) return;
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        await pb.collection('units').delete(id, { $autoCancel: false });
        ok++;
      } catch (e) {
        console.error(e);
        fail++;
      }
    }
    if (ok) toast.success(`Deleted ${ok} unit${ok === 1 ? '' : 's'}`);
    if (fail) toast.error(`${fail} could not be deleted`);
    clearSelection();
    fetchUnits();
  };

  const downloadTemplate = () => {
    downloadCsv('units-import-template.csv', [
      {
        property_id: '',
        property_name: 'Match by name if property_id empty',
        name: 'Unit A',
        type: 'Apartment',
        rent_amount: '1200',
        payment_period_months: '12',
        status: 'Vacant',
      },
    ]);
    toast.message('Template downloaded — use property_id from Properties or property_name to match');
  };

  const handleImportCsv = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    let text;
    try {
      text = await file.text();
    } catch (err) {
      console.error(err);
      toast.error('Could not read file');
      return;
    }
    const rows = parseCsv(text);
    if (!rows.length) {
      toast.error('No data rows found');
      return;
    }
    let ok = 0;
    let fail = 0;
    for (const row of rows) {
      let propId = row.property_id?.trim();
      const propName = row.property_name?.trim();
      if (!propId && propName) {
        const match = properties.find((p) => p.name.toLowerCase() === propName.toLowerCase());
        propId = match?.id;
      }
      const name = row.name?.trim();
      const rent = parseFloat(row.rent_amount);
      if (!propId || !name || Number.isNaN(rent) || rent <= 0) {
        fail++;
        continue;
      }
      let type = row.type?.trim() || 'Apartment';
      if (!UNIT_TYPES.has(type)) type = 'Apartment';
      let status = row.status?.trim() || 'Vacant';
      if (!UNIT_STATUSES.has(status)) status = 'Vacant';
      const ppmRaw = parseInt(String(row.payment_period_months ?? '').trim(), 10);
      const paymentPeriodMonths =
        Number.isFinite(ppmRaw) && ppmRaw >= 1 && ppmRaw <= 120 ? ppmRaw : 12;
      try {
        const fd = new FormData();
        fd.append('property_id', propId);
        fd.append('name', name);
        fd.append('type', type);
        fd.append('rent_amount', String(rent));
        fd.append('payment_period_months', String(paymentPeriodMonths));
        fd.append('status', status);
        await pb.collection('units').create(fd, { $autoCancel: false });
        ok++;
      } catch (err) {
        console.error(err);
        fail++;
      }
    }
    toast.message(`Imported ${ok} unit${ok === 1 ? '' : 's'}${fail ? ` (${fail} skipped or failed)` : ''}`);
    fetchUnits();
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedUnit(null);
  };

  if (loading) {
    return (
      <AppShell>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading units...</p>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <>
      <Helmet>
        <title>Units - BELIBELI DIGITAL MANAGER</title>
        <meta name="description" content="Manage your rental units and track occupancy status." />
      </Helmet>
      <AppShell>
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>Units</h1>
                  <p className="text-muted-foreground">Manage your rental units</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Filter by property" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Properties</SelectItem>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => {
                      setSelectedUnit(null);
                      setShowForm(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Unit
                  </Button>
                </div>
              </div>
              {filteredUnits.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  <span className="text-muted-foreground mr-2">Bulk: {selectedCount} selected</span>
                  <Button type="button" variant="outline" size="sm" onClick={selectAllFiltered}>
                    Select filtered
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={clearSelection}>
                    Clear
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={!selectedCount}
                    onClick={handleBulkDelete}
                  >
                    Delete selected
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="w-4 h-4 mr-1" />
                    Template
                  </Button>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleImportCsv}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => importInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    Import CSV
                  </Button>
                </div>
              )}
            </div>

            {filteredUnits.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Home className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No units yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first unit to get started</p>
                  <Button
                    onClick={() => {
                      setSelectedUnit(null);
                      setShowForm(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Unit
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUnits.map((unit) => {
                  const property = unit.expand?.property_id;
                  const locationLine = property?.location?.trim() || '';
                  return (
                  <Card
                    key={unit.id}
                    className="shadow-lg hover:shadow-xl transition-shadow duration-200 overflow-hidden flex flex-col relative"
                  >
                    <div className="absolute top-2 left-2 z-10 flex items-center gap-2 rounded-md bg-background/90 px-2 py-1 border">
                      <Checkbox
                        checked={!!selectedIds[unit.id]}
                        onCheckedChange={() => toggleSelect(unit.id)}
                        aria-label={`Select ${unit.name}`}
                      />
                    </div>
                    <div className="aspect-video w-full bg-muted shrink-0 overflow-hidden">
                      {unit.image ? (
                        <img
                          src={pb.files.getUrl(unit, unit.image)}
                          alt={unit.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full min-h-[140px] flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/15 via-muted to-muted text-muted-foreground px-4">
                          <Home className="w-14 h-14 opacity-40" strokeWidth={1.25} />
                          <span className="text-xs font-medium text-center">No photo yet — add one when editing</span>
                        </div>
                      )}
                    </div>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-xl leading-tight">{unit.name}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {property?.name || '—'}
                          </p>
                          <div
                            className="flex items-start gap-2 text-sm text-muted-foreground pt-2 border-t border-border/60 mt-3"
                            title={locationLine || undefined}
                          >
                            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" aria-hidden />
                            <span className="leading-snug line-clamp-3 break-words">
                              {locationLine || 'Location not set'}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 px-2 py-1 text-xs font-medium rounded-lg ${
                            unit.status === 'Vacant'
                              ? 'bg-secondary/10 text-secondary'
                              : 'bg-accent/10 text-accent'
                          }`}
                        >
                          {unit.status}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Type:</span>
                          <span className="font-medium">{unit.type}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Rent/Month:</span>
                          <AmountText value={unit.rent_amount} className="font-medium" />
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Payment period:</span>
                          <span className="font-medium">{unit.payment_period_months ?? 12} mo</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(unit)}
                          className="flex-1"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(unit.id)}
                          className="flex-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </AppShell>

      {showForm && (
        <UnitForm
          key={selectedUnit?.id ?? 'new-unit'}
          unit={selectedUnit}
          onClose={handleFormClose}
          onSuccess={fetchUnits}
        />
      )}
    </>
  );
};

export default UnitManagement;
