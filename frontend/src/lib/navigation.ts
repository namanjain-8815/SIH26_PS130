/**
 * Deterministically resolves the logical parent page in the Single Window application hierarchy.
 * Prevents router.back() from looping through query parameter changes, tab switches, or redirects.
 * Safely guards against navigating above the root dashboard (preventing 404s on /app, /government, /admin).
 */

const ROOT_PAGES = new Set([
  '/',
  '/login',
  '/app',
  '/app/dashboard',
  '/government',
  '/government/work-queue',
  '/admin',
  '/admin/approval-types',
]);

/**
 * Returns true if the user is on a subpage that has a logical parent to go back to.
 * Returns false if already at the root dashboard / home of that role.
 */
export function canNavigateBack(pathname: string): boolean {
  if (!pathname) return false;
  const cleanPath = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  if (ROOT_PAGES.has(cleanPath)) return false;
  return true;
}

/**
 * Resolves the parent route.
 */
export function getHierarchicalParent(pathname: string): string {
  if (!pathname) return '/app/dashboard';

  // Normalize path by stripping query params and trailing slashes
  const cleanPath = pathname.split('?')[0].replace(/\/+$/, '') || '/';

  // Root checks
  if (cleanPath === '/app/dashboard' || cleanPath === '/app') return '/app/dashboard';
  if (cleanPath === '/government/work-queue' || cleanPath === '/government') return '/government/work-queue';
  if (cleanPath === '/admin/approval-types' || cleanPath === '/admin') return '/admin/approval-types';

  // Specific project sub-views or forms -> Projects list
  if (cleanPath.startsWith('/app/projects/') && cleanPath !== '/app/projects') {
    return '/app/projects';
  }

  // Application dossier -> Approvals roadmap
  if (cleanPath.startsWith('/app/applications/')) {
    return '/app/approvals';
  }

  // Specific investor portal pages -> Dashboard
  const applicantTopLevelPages = [
    '/app/approvals',
    '/app/projects',
    '/app/documents',
    '/app/inspections',
    '/app/compliance',
    '/app/incentives',
    '/app/assistance',
    '/app/approval-directory',
    '/app/notifications',
    '/app/settings',
  ];
  if (applicantTopLevelPages.includes(cleanPath)) {
    return '/app/dashboard';
  }

  // Government portal pages -> Work Queue
  const governmentPages = [
    '/government/inspections',
    '/government/sla-monitor',
    '/government/facilitation',
    '/government/bottlenecks',
    '/government/analytics',
    '/government/notifications',
  ];
  if (governmentPages.includes(cleanPath)) {
    return '/government/work-queue';
  }

  // Admin portal pages -> Permissions Catalogue
  const adminPages = [
    '/admin/rules',
    '/admin/dependencies',
    '/admin/sla-policies',
    '/admin/incentive-schemes',
    '/admin/users',
    '/admin/audit-log',
  ];
  if (adminPages.includes(cleanPath)) {
    return '/admin/approval-types';
  }

  // Generic fallback: step up one directory segment, but NEVER leave at /app, /government, or /admin
  const segments = cleanPath.split('/').filter(Boolean);
  if (segments.length > 2) {
    segments.pop();
    const parent = '/' + segments.join('/');
    if (parent === '/app') return '/app/dashboard';
    if (parent === '/government') return '/government/work-queue';
    if (parent === '/admin') return '/admin/approval-types';
    return parent;
  }

  // Fallback for root sections
  if (cleanPath.startsWith('/government')) return '/government/work-queue';
  if (cleanPath.startsWith('/admin')) return '/admin/approval-types';
  return '/app/dashboard';
}

/**
 * Navigates one logical page back in the portal hierarchy.
 * Safely guards against navigating when already at root dashboard.
 */
export function navigateHierarchicalBack(
  pathname: string,
  router: { push: (url: string) => void },
  customFallback?: string
) {
  if (!canNavigateBack(pathname)) {
    // Already at root dashboard — do nothing to prevent 404 errors
    return;
  }
  const targetParent = customFallback || getHierarchicalParent(pathname);
  router.push(targetParent);
}
