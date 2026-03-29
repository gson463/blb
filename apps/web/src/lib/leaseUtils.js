
export const calculateLeaseStatus = (endDate) => {
  if (!endDate) return 'Unknown';
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return end < today ? 'Expired' : 'Active';
};

export const getDaysUntilExpiry = (endDate) => {
  if (!endDate) return 0;
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

export const generateLeaseNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `LSE-${year}${month}-${random}`;
};
