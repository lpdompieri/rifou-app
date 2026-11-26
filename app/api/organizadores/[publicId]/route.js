import { proxyRafflesRequest } from '../../raffles/proxy.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request, context) {
  const { publicId } = await context.params;
  if (typeof publicId !== 'string' || !/^[A-F0-9]{32}$/i.test(publicId)) {
    return Response.json({ message: 'O identificador do organizador é inválido.' }, { status: 400 });
  }
  return proxyRafflesRequest(request, { pathSegments: ['organizers', publicId], stripTrailingPathSegment: 'raffles' });
}
