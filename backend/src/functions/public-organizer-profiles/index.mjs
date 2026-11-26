import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const profilesTable = process.env.ORGANIZER_PROFILES_TABLE;
const profileIndex = process.env.PUBLIC_PROFILES_INDEX || 'ProfilesByPublicIdIndex';
const rafflesTable = process.env.RAFFLES_TABLE;
const ownerIndex = process.env.ORGANIZER_RAFFLES_INDEX || 'OrganizerRafflesByOwnerIndex';
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function json(statusCode, payload) {
  return { statusCode, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=30, stale-while-revalidate=60' }, body: JSON.stringify(payload) };
}

function formatPrice(value) {
  const price = Number(value);
  return Number.isFinite(price) ? (price / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00';
}

function toPublicRaffle(item, featured) {
  const count = Number(item.numberCount || 0);
  const reserved = Number(item.reservedCount || 0);
  const confirmed = Number(item.confirmedCount || 0);
  const prizeInCents = Number(item.priceInCents) * count;
  const date = typeof item.drawingDate === 'string' ? item.drawingDate : '';
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00.000Z`) : null;
  const drawingDateLong = parsed && !Number.isNaN(parsed.valueOf())
    ? `${String(parsed.getUTCDate()).padStart(2, '0')} de ${new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' }).format(parsed)} de ${parsed.getUTCFullYear()}`
    : 'A definir';
  const result = {
    id: item.raffleId,
    image: item.image || '',
    imageAlt: item.imageAlt || item.title || 'Imagem da rifa',
    organizer: item.organizer || 'Organizador',
    title: item.title || 'Rifa',
    description: item.description || '',
    prizeValue: Number.isSafeInteger(prizeInCents) && prizeInCents > 0 ? (prizeInCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00',
    price: formatPrice(item.priceInCents),
    numbers: String(count),
    drawingDate: parsed ? new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(parsed) : 'A definir',
    drawingDateLong,
    sold: count ? Math.min(100, Math.round(((reserved + confirmed) / count) * 100)) : 0,
    cardSold: Number(item.cardSoldPercent || 0),
    reserved,
    confirmed,
    status: item.status,
    featured,
  };
  if (item.status === 'DRAWN' && item.drawResult) result.drawResult = {
    number: Number(item.drawResult.number),
    winnerName: item.drawResult.winnerName || 'Participante',
    drawnAt: item.drawResult.drawnAt || '',
  };
  return result;
}

export const handler = async (event) => {
  if (!profilesTable || !rafflesTable) return json(500, { message: 'Os perfis públicos ainda não estão configurados.' });
  const publicId = event.pathParameters?.publicId;
  if (typeof publicId !== 'string' || !/^[A-F0-9]{32}$/i.test(publicId)) return json(400, { message: 'O identificador do organizador é inválido.' });
  try {
    const profileResult = await dynamo.send(new QueryCommand({
      TableName: profilesTable,
      IndexName: profileIndex,
      KeyConditionExpression: '#publicId = :publicId',
      ExpressionAttributeNames: { '#publicId': 'publicId' },
      ExpressionAttributeValues: { ':publicId': publicId.toUpperCase() },
      Limit: 2,
    }));
    if ((profileResult.Items || []).length !== 1) return json(404, { message: 'Perfil público não encontrado.' });
    const profile = profileResult.Items[0];
    const raffles = [];
    let exclusiveStartKey;
    do {
      const result = await dynamo.send(new QueryCommand({
        TableName: rafflesTable,
        IndexName: ownerIndex,
        KeyConditionExpression: '#owner = :owner',
        ExpressionAttributeNames: { '#owner': 'organizerSub' },
        ExpressionAttributeValues: { ':owner': profile.organizerSub },
        ScanIndexForward: false,
        Limit: 100,
        ExclusiveStartKey: exclusiveStartKey,
      }));
      raffles.push(...(result.Items || []));
      exclusiveStartKey = result.LastEvaluatedKey;
    } while (exclusiveStartKey);
    const eligible = raffles.filter((raffle) => raffle.publicStatus === raffle.status && ['ACTIVE', 'DRAWN'].includes(raffle.status));
    const featuredIds = new Set(Array.isArray(profile.featuredRaffleIds) ? profile.featuredRaffleIds : []);
    const items = eligible.map((raffle) => toPublicRaffle(raffle, featuredIds.has(raffle.raffleId)))
      .sort((first, second) => Number(second.featured) - Number(first.featured) || second.id.localeCompare(first.id));
    return json(200, { profile: {
      publicId: profile.publicId,
      publicName: profile.publicName || 'Organizador',
      message: profile.message || '',
      logoUrl: profile.logoUrl || '',
    }, items, count: items.length });
  } catch (error) {
    console.error('Failed to read public organizer profile.', { name: error?.name || 'UnknownError', requestId: event.requestContext?.requestId });
    return json(500, { message: 'Não foi possível carregar este perfil agora.' });
  }
};
