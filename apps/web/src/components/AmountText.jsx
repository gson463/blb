import React from 'react';
import { formatCurrency } from '@/lib/paymentUtils';
import { cn } from '@/lib/utils';

/** Money amounts: high-contrast (readable in light and dark). */
export function AmountText({ value, className, ...props }) {
  return (
    <span className={cn('text-amount', className)} {...props}>
      {formatCurrency(value)}
    </span>
  );
}
