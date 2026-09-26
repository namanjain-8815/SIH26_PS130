import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// shadcn/ui's standard class-merging helper — required by every generated
// shadcn component (`npx shadcn@latest add ...`).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
