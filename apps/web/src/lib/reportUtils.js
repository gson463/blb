
import pb from '@/lib/pocketbaseClient';

// Helper to check if a date falls within a range
const isWithinRange = (dateString, dateRange) => {
  if (!dateRange || !dateRange.start || !dateRange.end) return true;
  const date = new Date(dateString);
  const start = new Date(dateRange.start);
  const end = new Date(dateRange.end);
  end.setHours(23, 59, 59, 999); // End of the day
  return date >= start && date <= end;
};

export const calculateTotalRevenue = (invoices, dateRange = null) => {
  if (!Array.isArray(invoices)) return 0;
  return invoices
    .filter(inv => isWithinRange(inv.created, dateRange))
    .reduce((sum, inv) => sum + (inv.amount || 0), 0);
};

export const calculateTotalCollected = (payments, dateRange = null) => {
  if (!Array.isArray(payments)) return 0;
  return payments
    .filter(p => p.status === 'Approved' && isWithinRange(p.payment_date, dateRange))
    .reduce((sum, p) => sum + (p.amount || 0), 0);
};

export const calculateTotalPendingApproval = (payments, dateRange = null) => {
  if (!Array.isArray(payments)) return 0;
  return payments
    .filter(p => p.status === 'Pending Approval' && isWithinRange(p.payment_date, dateRange))
    .reduce((sum, p) => sum + (p.amount || 0), 0);
};

export const calculateTotalUnpaid = (invoices, payments, dateRange = null) => {
  if (!Array.isArray(invoices)) return 0;
  return invoices
    .filter(inv => inv.status === 'Unpaid' && isWithinRange(inv.created, dateRange))
    .reduce((sum, inv) => sum + (inv.amount || 0), 0);
};

export const calculateOccupancyRate = (units) => {
  if (!Array.isArray(units) || units.length === 0) return 0;
  const occupied = units.filter(u => u.status === 'Occupied').length;
  return Math.round((occupied / units.length) * 100);
};

export const calculateCollectionRate = (invoices, payments, dateRange = null) => {
  const totalInvoiced = calculateTotalRevenue(invoices, dateRange);
  const totalCollected = calculateTotalCollected(payments, dateRange);
  if (totalInvoiced === 0) return 0;
  return Math.round((totalCollected / totalInvoiced) * 100);
};

export const calculateLeaseExpiryStats = (leases) => {
  if (!Array.isArray(leases)) return { active: 0, within30: 0, within90: 0, expired: 0 };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const stats = { active: 0, within30: 0, within90: 0, expired: 0 };
  
  leases.forEach(lease => {
    if (lease.status === 'Expired') {
      stats.expired++;
      return;
    }
    
    const endDate = new Date(lease.end_date);
    if (endDate < today) {
      stats.expired++;
    } else {
      stats.active++;
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 30) stats.within30++;
      if (diffDays <= 90) stats.within90++;
    }
  });
  
  return stats;
};

export const getPropertyWiseBreakdown = (properties, units, invoices, payments) => {
  if (!Array.isArray(properties)) return [];
  
  return properties.map(prop => {
    const propUnits = units.filter(u => u.property_id === prop.id);
    const propInvoices = invoices.filter(i => i.property_id === prop.id);
    const propPayments = payments.filter(p => p.property_id === prop.id);
    
    const totalUnits = propUnits.length;
    const occupiedUnits = propUnits.filter(u => u.status === 'Occupied').length;
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
    
    const totalInvoiced = propInvoices.reduce((sum, i) => sum + i.amount, 0);
    const totalCollected = propPayments.filter(p => p.status === 'Approved').reduce((sum, p) => sum + p.amount, 0);
    const totalPending = propPayments.filter(p => p.status === 'Pending Approval').reduce((sum, p) => sum + p.amount, 0);
    const totalUnpaid = propInvoices.filter(i => i.status === 'Unpaid').reduce((sum, i) => sum + i.amount, 0);
    const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;
    
    return {
      id: prop.id,
      name: prop.name,
      location: prop.location,
      totalUnits,
      occupiedUnits,
      occupancyRate,
      totalInvoiced,
      totalCollected,
      totalPending,
      totalUnpaid,
      collectionRate
    };
  });
};

export const getPaymentStatusBreakdown = (payments, dateRange = null) => {
  if (!Array.isArray(payments)) return [];
  
  const filtered = payments.filter(p => isWithinRange(p.payment_date, dateRange));
  const approved = filtered.filter(p => p.status === 'Approved').reduce((sum, p) => sum + p.amount, 0);
  const pending = filtered.filter(p => p.status === 'Pending Approval').reduce((sum, p) => sum + p.amount, 0);
  const rejected = filtered.filter(p => p.status === 'Rejected').reduce((sum, p) => sum + p.amount, 0);
  
  return [
    { name: 'Approved', value: approved, color: 'hsl(var(--secondary))' },
    { name: 'Pending', value: pending, color: 'hsl(var(--accent))' },
    { name: 'Rejected', value: rejected, color: 'hsl(var(--destructive))' }
  ];
};

export const getMonthlyRevenueTrend = (invoices, dateRange = null) => {
  if (!Array.isArray(invoices)) return [];
  
  const filtered = invoices.filter(inv => isWithinRange(inv.created, dateRange));
  const monthlyData = {};
  
  filtered.forEach(inv => {
    const date = new Date(inv.created);
    const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
    
    if (!monthlyData[monthYear]) {
      monthlyData[monthYear] = { name: monthYear, invoiced: 0, unpaid: 0 };
    }
    
    monthlyData[monthYear].invoiced += inv.amount;
    if (inv.status === 'Unpaid') {
      monthlyData[monthYear].unpaid += inv.amount;
    }
  });
  
  // Sort chronologically (simplified sort assuming recent months)
  return Object.values(monthlyData);
};

export const getAverageApprovalTime = (payments) => {
  if (!Array.isArray(payments)) return 0;
  
  const approved = payments.filter(p => p.status === 'Approved' && p.approval_date && p.created);
  if (approved.length === 0) return 0;
  
  const totalDiff = approved.reduce((sum, p) => {
    const created = new Date(p.created).getTime();
    const approvedDate = new Date(p.approval_date).getTime();
    return sum + (approvedDate - created);
  }, 0);
  
  // Return in hours
  return Math.round(totalDiff / approved.length / (1000 * 60 * 60));
};

export const getUnitTypeDistribution = (units) => {
  if (!Array.isArray(units)) return [];
  
  const distribution = {};
  units.forEach(u => {
    const type = u.type || 'Unknown';
    distribution[type] = (distribution[type] || 0) + 1;
  });
  
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  
  return Object.entries(distribution).map(([name, value], index) => ({
    name,
    value,
    color: colors[index % colors.length]
  }));
};

export const getLeaseStatusBreakdown = (leases) => {
  if (!Array.isArray(leases)) return [];
  
  const stats = calculateLeaseExpiryStats(leases);
  
  return [
    { name: 'Active (>90 days)', value: stats.active - stats.within90, color: 'hsl(var(--secondary))' },
    { name: 'Expiring <90 days', value: stats.within90 - stats.within30, color: 'hsl(var(--accent))' },
    { name: 'Expiring <30 days', value: stats.within30, color: 'hsl(var(--destructive))' },
    { name: 'Expired', value: stats.expired, color: 'hsl(var(--muted-foreground))' }
  ];
};

export const getPaymentsByProperty = (payments, properties, dateRange = null) => {
  if (!Array.isArray(payments) || !Array.isArray(properties)) return [];
  
  const filtered = payments.filter(p => isWithinRange(p.payment_date, dateRange));
  
  return properties.map(prop => {
    const propPayments = filtered.filter(p => p.property_id === prop.id);
    return {
      name: prop.name,
      approved: propPayments.filter(p => p.status === 'Approved').reduce((sum, p) => sum + p.amount, 0),
      pending: propPayments.filter(p => p.status === 'Pending Approval').reduce((sum, p) => sum + p.amount, 0)
    };
  });
};
