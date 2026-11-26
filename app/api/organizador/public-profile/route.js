import { proxyOrganizerRequest } from '../_proxy.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  return proxyOrganizerRequest(request, { pathSegments: ['public-profile'] });
}

export async function PUT(request) {
  return proxyOrganizerRequest(request, { pathSegments: ['public-profile'], method: 'PUT' });
}
