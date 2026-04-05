import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

/** Use inside DropdownMenuContent (before profile/logout items). */
export function ThemeDropdownSection() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <>
      <DropdownMenuLabel>Theme</DropdownMenuLabel>
      <DropdownMenuRadioGroup value={theme ?? 'system'} onValueChange={setTheme}>
        <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="forest-walk">Forest walk</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="night-dream">Night dream</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="forest">Forest</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="winter-blue">Winter blue</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
    </>
  );
}
