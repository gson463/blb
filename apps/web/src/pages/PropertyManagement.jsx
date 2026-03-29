
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { buildPropertiesFilter, getPropertyOwnerId } from '@/lib/staffDataScope';
import { downloadCsv, parseCsv } from '@/lib/csvUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import AppShell from '@/components/AppShell.jsx';
import PropertyForm from '@/components/PropertyForm.jsx';
import { Plus, MapPin, Edit, Trash2, Building2, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';

const PropertyManagement = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedIds, setSelectedIds] = useState({});
  const importInputRef = useRef(null);

  const fetchProperties = useCallback(async () => {
    try {
      const records = await pb.collection('properties').getFullList({
        filter: buildPropertiesFilter(currentUser),
        sort: '-created',
        $autoCancel: false
      });
      setProperties(records);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.id) return;
    fetchProperties();
  }, [currentUser?.id, fetchProperties]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectAllVisible = () => {
    const next = { ...selectedIds };
    properties.forEach((p) => {
      next[p.id] = true;
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
      toast.message('Select one or more properties first');
      return;
    }
    if (!window.confirm(`Delete ${ids.length} propert${ids.length === 1 ? 'y' : 'ies'}? This cannot be undone.`)) return;
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        await pb.collection('properties').delete(id, { $autoCancel: false });
        ok++;
      } catch (e) {
        console.error(e);
        fail++;
      }
    }
    if (ok) toast.success(`Deleted ${ok} propert${ok === 1 ? 'y' : 'ies'}`);
    if (fail) toast.error(`${fail} could not be deleted (may have units or related data)`);
    clearSelection();
    fetchProperties();
  };

  const downloadTemplate = () => {
    downloadCsv('properties-import-template.csv', [
      { name: 'Example Property', location: 'City, Country', description: 'Optional notes' },
    ]);
    toast.message('Template downloaded — replace the example row or add more rows');
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
      toast.error('No data rows found in CSV');
      return;
    }
    let ok = 0;
    let fail = 0;
    for (const row of rows) {
      const name = row.name?.trim();
      const location = row.location?.trim();
      if (!name || !location) {
        fail++;
        continue;
      }
      try {
        const fd = new FormData();
        fd.append('name', name);
        fd.append('location', location);
        fd.append('description', row.description?.trim() || '');
        fd.append('landlord_id', getPropertyOwnerId(currentUser));
        await pb.collection('properties').create(fd, { $autoCancel: false });
        ok++;
      } catch (err) {
        console.error(err);
        fail++;
      }
    }
    toast.message(`Imported ${ok} propert${ok === 1 ? 'y' : 'ies'}${fail ? ` (${fail} skipped or failed)` : ''}`);
    fetchProperties();
  };

  const handleEdit = (property) => {
    setSelectedProperty(property);
    setShowForm(true);
  };

  const handleDelete = async (propertyId) => {
    if (!window.confirm('Are you sure you want to delete this property?')) return;

    try {
      await pb.collection('properties').delete(propertyId, { $autoCancel: false });
      toast.success('Property deleted successfully');
      fetchProperties();
    } catch (error) {
      console.error('Error deleting property:', error);
      toast.error('Failed to delete property');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedProperty(null);
  };

  if (loading) {
    return (
      <AppShell>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading properties...</p>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <>
      <Helmet>
        <title>Properties - BELIBELI DIGITAL MANAGER</title>
        <meta name="description" content="Manage your rental properties and view property details." />
      </Helmet>
      <AppShell>
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>Properties</h1>
                  <p className="text-muted-foreground">Manage your rental properties</p>
                </div>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Property
                </Button>
              </div>
              {properties.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  <span className="text-muted-foreground mr-2">
                    Bulk: {selectedCount} selected
                  </span>
                  <Button type="button" variant="outline" size="sm" onClick={selectAllVisible}>
                    Select all
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

            {properties.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No properties yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first property to get started</p>
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Property
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((property) => (
                  <Card
                    key={property.id}
                    className="shadow-lg hover:shadow-xl transition-shadow duration-200 overflow-hidden flex flex-col relative"
                  >
                    <div className="absolute top-2 left-2 z-10 flex items-center gap-2 rounded-md bg-background/90 px-2 py-1 border">
                      <Checkbox
                        checked={!!selectedIds[property.id]}
                        onCheckedChange={() => toggleSelect(property.id)}
                        aria-label={`Select ${property.name}`}
                      />
                    </div>
                    <div className="aspect-video w-full bg-muted shrink-0 overflow-hidden">
                      {property.image ? (
                        <img
                          src={pb.files.getUrl(property, property.image)}
                          alt={property.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full min-h-[140px] flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/15 via-muted to-muted text-muted-foreground px-4">
                          <Building2 className="w-14 h-14 opacity-40" strokeWidth={1.25} />
                          <span className="text-xs font-medium">No photo yet — add one when editing</span>
                        </div>
                      )}
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl leading-tight">{property.name}</CardTitle>
                      <div
                        className="flex items-start gap-2 text-sm text-muted-foreground pt-2 border-t border-border/60 mt-3"
                        title={property.location?.trim() || undefined}
                      >
                        <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" aria-hidden />
                        <span className="leading-snug line-clamp-3 break-words">
                          {property.location?.trim() ? property.location.trim() : 'Location not set'}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {property.description && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{property.description}</p>
                      )}
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(property)}
                          className="flex-1"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(property.id)}
                          className="flex-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </AppShell>

      {showForm && (
        <PropertyForm
          property={selectedProperty}
          onClose={handleFormClose}
          onSuccess={fetchProperties}
        />
      )}
    </>
  );
};

export default PropertyManagement;
