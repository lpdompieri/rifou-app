import { proxyRafflesRequest } from '../../raffles/proxy.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isValidPurchaseCode(code) {
  return typeof code === 'string' && (
    /^RF-[A-F0-9]{32}$/i.test(code)
    || /^RF-[0-9A-HJKMNP-TV-Z]{4}(?:-[0-9A-HJKMNP-TV-Z]{4}){3}$/i.test(code)
  );
}

export async function GET(request, context) {
  const { purchaseCode } = await context.params;
  if (!isValidPurchaseCode(purchaseCode)) {
    return Response.json({ message: 'Informe um código de compra válido.' }, { status: 400 });
  }
  return proxyRafflesRequest(request, { pathSegments: ['purchases', purchaseCode], stripTrailingPathSegment: 'raffles' });
}

export async function POST(request, context) {
  const { purchaseCode } = await context.params;
  if (!isValidPurchaseCode(purchaseCode)) {
    return Response.json({ message: 'Informe um código de compra válido.' }, { status: 400 });
  }
  return proxyRafflesRequest(request, { pathSegments: ['purchases', purchaseCode], method: 'POST', stripTrailingPathSegment: 'raffles' });
}
