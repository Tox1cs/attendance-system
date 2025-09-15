"use client";

import { Switch as HeadlessSwitch } from '@headlessui/react';
import { cn } from '@/lib/utils';

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export default function Switch({ checked, onChange }: SwitchProps) {
  return (
    <HeadlessSwitch
      checked={checked}
      onChange={onChange}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900',
        checked ? 'bg-indigo-600' : 'bg-gray-600'
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </HeadlessSwitch>
  );
}