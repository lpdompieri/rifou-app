import { createHmac, randomUUID } from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { DynamoDBDocumentClient, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';

const transactionsTable = process.env.RAFFLE_TRANSACTIONS_TABLE;
const rafflesTable = process.env.RAFFLES_TABLE;
const lookupIndex = process.env.PURCHASE_CODE_INDEX || 'PurchasesByCodeHashIndex';
const secretArn = process.env.PARTICIPANT_LIMIT_HASH_SECRET_ARN;
const bucket = process.env.RAFFLE_IMAGES_BUCKET;
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const secretsManager = new SecretsManagerClient({});
const s3 = new S3Client({});
const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const PROOF_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
let secretPromise;

function json(statusCode, payload) {
  return { statusCode, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, body: JSON.stringify(payload) };
}

function readBody(event) {
  if (typeof event.body !== 'string' || !event.body) return null;
  try { return JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body); } catch { return null; }
}

async function codeHash(code) {
  secretPromise ||= secretsManager.send(new GetSecretValueCommand({ SecretId: secretArn })).then((result) => {
    if (!result.SecretString || result.SecretString.length < 32) throw new Error('Purchase lookup secret is invalid.');
    return result.SecretString;
  }).catch((error) => { secretPromise = undefined; throw error; });
  return createHmac('sha256', await secretPromise).update(code, 'utf8').digest('hex');
}

async function findOrder(code) {
  const hash = await codeHash(code);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await dynamo.send(new QueryCommand({
      TableName: transactionsTable,
      IndexName: lookupIndex,
      KeyConditionExpression: '#codeHash = :codeHash',
      ExpressionAttributeNames: { '#codeHash': 'purchaseCodeHash' },
      ExpressionAttributeValues: { ':codeHash': hash },
      Limit: 2,
    }));
    if ((result.Items || []).length === 1) return result.Items[0];
    if (attempt < 1) await new Promise((resolve) => setTimeout(resolve, 60));
  }
  return null;
}

function normalizeCode(value) {
  const code = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  return /^RF-[A-F0-9]{32}$/.test(code)
    || /^RF-[0-9A-HJKMNP-TV-Z]{4}(?:-[0-9A-HJKMNP-TV-Z]{4}){3}$/.test(code)
    ? code
    : '';
}

async function getPublicPurchase(event, code) {
  const order = await findOrder(code);
  if (!order) return json(404, { message: 'Compra não encontrada. Confira o código e tente novamente.' });
  const raffleResult = await dynamo.send(new GetCommand({ TableName: rafflesTable, Key: { raffleId: order.raffleId }, ConsistentRead: true }));
  const raffle = raffleResult.Item;
  if (!raffle) return json(404, { message: 'Esta compra não está disponível para consulta.' });
  const isActive = raffle.status === 'ACTIVE';
  const isDrawn = ['DRAWN', 'COMPLETED'].includes(raffle.status) && raffle.drawResult;
  const canSubmitProof = Boolean(isActive && order.status === 'PENDING' && Number(order.expiresAtEpoch) > Math.floor(Date.now() / 1000));
  const result = isDrawn ? {
    number: Number(raffle.drawResult.number),
    winnerName: raffle.drawResult.winnerName || 'Participante',
    drawnAt: raffle.drawResult.drawnAt || '',
    participantWon: order.status === 'CONFIRMED' && order.numbers?.includes(Number(raffle.drawResult.number)),
  } : null;
  return json(200, { item: {
    purchaseCode: code,
    raffleId: order.raffleId,
    raffleTitle: order.raffleTitle || raffle.title || 'Rifa',
    organizer: raffle.organizer || 'Organizador',
    numbers: Array.isArray(order.numbers) ? order.numbers : [],
    amountInCents: Number(order.amountInCents || 0),
    createdAt: order.createdAt || '',
    status: order.status || 'PENDING',
    raffleStatus: raffle.status,
    expiresAt: order.expiresAt || '',
    paymentConfirmedAt: order.paymentConfirmedAt || '',
    isDemo: Boolean(order.isDemo),
    canSubmitProof,
    proofSubmittedAt: order.paymentProofSubmittedAt || '',
    proofReviewStatus: order.paymentProofReviewStatus || '',
    proofReviewNote: Array.isArray(order.paymentProofReviewHistory) ? order.paymentProofReviewHistory.at(-1)?.note || '' : '',
    conflictNumbers: Array.isArray(order.paymentProofConflictNumbers) ? order.paymentProofConflictNumbers : [],
    refundResolutionStatus: order.refundResolutionStatus || '',
    refundResolutionUpdatedAt: order.refundResolutionUpdatedAt || '',
    result,
  } });
}

async function requestProofUpload(code, order, payload) {
  if (!bucket) return json(500, { message: 'O envio de comprovantes ainda não está configurado.' });
  const contentType = String(payload?.contentType || '').toLowerCase();
  const size = Number(payload?.size);
  if (!PROOF_TYPES.has(contentType) || !Number.isSafeInteger(size) || size < 1 || size > MAX_PROOF_BYTES) {
    return json(400, { message: 'Envie uma imagem JPG, PNG, WebP ou AVIF de até 5 MB.' });
  }
  const nowEpoch = Math.floor(Date.now() / 1000);
  if (order.status !== 'PENDING' || Number(order.expiresAtEpoch) <= nowEpoch) {
    return json(409, { message: 'A reserva expirou ou já foi atualizada. Não é possível anexar um comprovante agora.' });
  }
  const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' })[contentType];
  const key = `payment-proofs/${order.raffleId}/${order.transactionId}/${randomUUID()}.${extension}`;
  const signedPost = await createPresignedPost(s3, {
    Bucket: bucket,
    Key: key,
    Expires: 300,
    Fields: { key, 'Content-Type': contentType },
    Conditions: [['eq', '$key', key], ['eq', '$Content-Type', contentType], ['content-length-range', 1, MAX_PROOF_BYTES]],
  });
  try {
    await dynamo.send(new UpdateCommand({
      TableName: transactionsTable,
      Key: { transactionId: order.transactionId },
      UpdateExpression: 'SET #uploadKey = :key, #uploadType = :type, #uploadSize = :size',
      ConditionExpression: '#status = :pending AND #expiresAt > :now',
      ExpressionAttributeNames: { '#uploadKey': 'proofUploadKey', '#uploadType': 'proofUploadContentType', '#uploadSize': 'proofUploadSize', '#status': 'status', '#expiresAt': 'expiresAtEpoch' },
      ExpressionAttributeValues: { ':key': key, ':type': contentType, ':size': size, ':pending': 'PENDING', ':now': nowEpoch },
    }));
  } catch (error) {
    if (error?.name === 'ConditionalCheckFailedException') return json(409, { message: 'A reserva expirou durante o envio. Consulte a compra novamente.' });
    throw error;
  }
  return json(200, { upload: { url: signedPost.url, fields: signedPost.fields, objectKey: key } });
}

async function submitProof(code, order, payload) {
  const objectKey = String(payload?.objectKey || '');
  if (!objectKey || objectKey !== order.proofUploadKey || !objectKey.startsWith(`payment-proofs/${order.raffleId}/${order.transactionId}/`)) {
    return json(400, { message: 'O arquivo enviado não corresponde a esta compra.' });
  }
  const nowEpoch = Math.floor(Date.now() / 1000);
  if (order.status !== 'PENDING' || Number(order.expiresAtEpoch) <= nowEpoch) {
    return json(409, { message: 'A reserva expirou ou já foi atualizada. O comprovante não foi associado.' });
  }
  const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }));
  if (!PROOF_TYPES.has(head.ContentType || '') || !Number.isSafeInteger(Number(head.ContentLength))
    || Number(head.ContentLength) < 1 || Number(head.ContentLength) > MAX_PROOF_BYTES
    || Number(head.ContentLength) !== Number(order.proofUploadSize)) {
    return json(400, { message: 'O arquivo enviado não passou pela validação de tipo ou tamanho.' });
  }
  const submittedAt = new Date().toISOString();
  await dynamo.send(new UpdateCommand({
    TableName: transactionsTable,
    Key: { transactionId: order.transactionId },
    UpdateExpression: 'SET #status = :review, #proofKey = :proofKey, #submittedAt = :submittedAt, #proofPending = :true, #reviewStatus = :waiting, #reviewHistory = list_append(if_not_exists(#reviewHistory, :empty), :entry) REMOVE #uploadKey, #uploadType, #uploadSize',
    ConditionExpression: '#status = :pending AND #expiresAt > :now AND #uploadKey = :proofKey',
    ExpressionAttributeNames: { '#status': 'status', '#proofKey': 'paymentProofKey', '#submittedAt': 'paymentProofSubmittedAt', '#proofPending': 'paymentProofPending', '#reviewStatus': 'paymentProofReviewStatus', '#reviewHistory': 'paymentProofReviewHistory', '#uploadKey': 'proofUploadKey', '#uploadType': 'proofUploadContentType', '#uploadSize': 'proofUploadSize', '#expiresAt': 'expiresAtEpoch' },
    ExpressionAttributeValues: { ':review': 'UNDER_REVIEW', ':pending': 'PENDING', ':proofKey': objectKey, ':submittedAt': submittedAt, ':true': true, ':waiting': 'PENDING', ':empty': [], ':entry': [{ status: 'PENDING', occurredAt: submittedAt, note: '', proofKey: objectKey }], ':now': nowEpoch },
  }));
  return json(200, { item: { purchaseCode: code, status: 'UNDER_REVIEW', submittedAt } });
}

export const handler = async (event) => {
  if (!transactionsTable || !rafflesTable || !secretArn) return json(500, { message: 'A consulta de compras não está configurada.' });
  const code = normalizeCode(event.pathParameters?.purchaseCode);
  if (!code) return json(400, { message: 'Informe um código de compra válido.' });
  try {
    const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
    if (method === 'GET') return await getPublicPurchase(event, code);
    if (method !== 'POST') return json(405, { message: 'Método não permitido.' });
    const order = await findOrder(code);
    if (!order) return json(404, { message: 'Compra não encontrada. Confira o código e tente novamente.' });
    const payload = readBody(event);
    if (payload?.action === 'request-upload') return await requestProofUpload(code, order, payload);
    if (payload?.action === 'submit-proof') return await submitProof(code, order, payload);
    return json(400, { message: 'A ação de comprovante é inválida.' });
  } catch (error) {
    console.error('Purchase lookup request failed.', { name: error?.name || 'UnknownError', requestId: event.requestContext?.requestId });
    return json(500, { message: 'Não foi possível consultar a compra agora.' });
  }
};
