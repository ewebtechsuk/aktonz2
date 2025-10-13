import type { NextApiRequest, NextApiResponse } from 'next';
import { sendMailGraph } from '../../lib/ms-graph';
import { addOffer } from '../../lib/offers.js';
import { formatOfferFrequencyLabel } from '../../lib/offer-frequency.mjs';

type FormBody = {
  name?: string;
  email?: string;
  phone?: string;
  offerAmount?: string | number;
  propertyId?: string;
  message?: string;
  propertyTitle?: string;
  propertyAddress?: string;
  address?: string;
  frequency?: string;
  depositAmount?: string | number;
  moveInDate?: string;
  desiredMoveInDate?: string;
  householdSize?: string | number;
  partySize?: string | number;
  hasPets?: string | boolean | number;
  employmentStatus?: string;
  referencingConsent?: string | boolean | number;
  consentToReference?: string | boolean | number;
  proofOfFunds?: string;
  additionalConditions?: string;
  conditions?: string;
  specialConditions?: string;
  [key: string]: unknown;
};

const RECIPIENTS = ['info@aktonz.com'];
const FORM_TITLE = 'Offer submission';
const SUBJECT = 'aktonz.com offer submission';

function normaliseBody(req: NextApiRequest): FormBody {
  if (!req.body) {
    return {};
  }

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as FormBody;
    } catch (error) {
      throw new Error('Invalid JSON payload');
    }
  }

  return req.body as FormBody;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitiseNumericString(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (!/\d/.test(trimmed)) {
    return null;
  }

  const withoutPrefix = trimmed.replace(/^[^\d+-]+/, '');
  const normalised = withoutPrefix.replace(/[\s,]+/g, '');

  return normalised;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const sanitised = sanitiseNumericString(value);
    if (!sanitised) {
      return null;
    }

    const parsed = Number.parseFloat(sanitised);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function formatCurrency(value: unknown): string {
  const numeric = toNumber(value);
  if (numeric === null) {
    return String(value ?? '');
  }

  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(numeric);
}

function hasValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim() !== '';
  }

  return true;
}

function normaliseString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function normaliseBoolean(value: unknown): boolean | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (Number.isNaN(value)) {
      return undefined;
    }
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalised = value.trim().toLowerCase();
    if (!normalised) {
      return undefined;
    }

    if (['true', '1', 'yes', 'y', 'on'].includes(normalised)) {
      return true;
    }
    if (['false', '0', 'no', 'n', 'off'].includes(normalised)) {
      return false;
    }
  }

  return undefined;
}

function normalisePositiveInteger(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const sanitised = sanitiseNumericString(value);
    if (!sanitised) {
      return undefined;
    }

    const parsed = Number.parseInt(sanitised, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return undefined;
}

function normaliseDate(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function formatBoolean(value: unknown): string {
  const normalised = normaliseBoolean(value);
  if (normalised === undefined) {
    return String(value ?? '');
  }

  return normalised ? 'Yes' : 'No';
}

function formatDate(value: unknown): string {
  if (typeof value !== 'string' || !value) {
    return String(value ?? '');
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  try {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return date.toISOString();
  }
}

type ValidatedOffer = {
  propertyId: string;
  propertyTitle?: string;
  propertyAddress?: string;
  offerAmount: number;
  frequency?: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  depositAmount?: string | number;
  moveInDate?: string;
  householdSize?: number;
  hasPets?: boolean;
  employmentStatus?: string;
  referencingConsent?: boolean;
  proofOfFunds?: string;
  additionalConditions?: string;
};

function validateBody(body: FormBody): { data?: ValidatedOffer; errors?: string[] } {
  const errors: string[] = [];

  const propertyId = normaliseString(body.propertyId);
  if (!propertyId) {
    errors.push('Property reference is required.');
  }

  const offerAmount = toNumber(body.offerAmount);
  if (offerAmount === null || offerAmount <= 0) {
    errors.push('Offer amount must be a positive number.');
  }

  const name = normaliseString(body.name);
  if (!name) {
    errors.push('Name is required.');
  }

  const email = normaliseString(body.email);
  if (!email) {
    errors.push('Email is required.');
  }

  if (errors.length > 0) {
    return { errors };
  }

  const frequency = normaliseString(body.frequency);
  const propertyTitle = normaliseString(body.propertyTitle);
  const propertyAddressInput =
    typeof body.propertyAddress === 'string'
      ? body.propertyAddress
      : typeof body.address === 'string'
        ? body.address
        : undefined;
  const propertyAddress = normaliseString(propertyAddressInput);
  const phone = normaliseString(body.phone);
  const message = normaliseString(body.message);
  const moveInDate =
    normaliseDate(body.moveInDate) ?? normaliseDate(body.desiredMoveInDate);
  const householdSize =
    normalisePositiveInteger(body.householdSize) ??
    normalisePositiveInteger(body.partySize);
  const hasPets = normaliseBoolean(body.hasPets);
  const employmentStatus = normaliseString(body.employmentStatus);
  const referencingConsent =
    normaliseBoolean(body.referencingConsent) ??
    normaliseBoolean(body.consentToReference);
  const proofOfFunds = normaliseString(body.proofOfFunds);
  const additionalConditions =
    normaliseString(body.additionalConditions) ??
    normaliseString(body.conditions) ??
    normaliseString(body.specialConditions);

  return {
    data: {
      propertyId: propertyId!,
      propertyTitle,
      propertyAddress,
      offerAmount: offerAmount!,
      frequency: frequency || undefined,
      name: name!,
      email: email!,
      phone: phone || undefined,
      message: message || undefined,
      depositAmount: body.depositAmount,
      moveInDate: moveInDate || undefined,
      householdSize: householdSize || undefined,
      hasPets: hasPets !== undefined ? hasPets : undefined,
      employmentStatus: employmentStatus || undefined,
      referencingConsent:
        referencingConsent !== undefined ? referencingConsent : undefined,
      proofOfFunds: proofOfFunds || undefined,
      additionalConditions: additionalConditions || undefined,
    },
  };
}

export function buildHtml(body: FormBody): string {
  const rows: Array<[string, unknown]> = [
    ['Name', body.name ?? ''],
    ['Email', body.email ?? ''],
  ];

  if (hasValue(body.phone)) {
    rows.push(['Phone', body.phone ?? '']);
  }

  if (hasValue(body.offerAmount)) {
    rows.push(['Offer amount', formatCurrency(body.offerAmount)]);
  }

  if (hasValue(body.frequency)) {
    const frequencyLabel = formatOfferFrequencyLabel(body.frequency);
    const displayFrequency = frequencyLabel || String(body.frequency ?? '');
    rows.push(['Offer frequency', displayFrequency]);
  }

  if (hasValue(body.depositAmount)) {
    rows.push(['Holding deposit', formatCurrency(body.depositAmount)]);
  }

  if (hasValue(body.moveInDate)) {
    rows.push(['Preferred move-in date', formatDate(body.moveInDate)]);
  }

  if (hasValue(body.householdSize)) {
    rows.push(['Household size', body.householdSize ?? '']);
  }

  if (hasValue(body.hasPets)) {
    rows.push(['Has pets', formatBoolean(body.hasPets)]);
  }

  if (hasValue(body.employmentStatus)) {
    rows.push(['Employment status', body.employmentStatus ?? '']);
  }

  if (hasValue(body.referencingConsent)) {
    rows.push(['Consent to referencing', formatBoolean(body.referencingConsent)]);
  }

  if (hasValue(body.proofOfFunds)) {
    rows.push(['Proof of funds', body.proofOfFunds ?? '']);
  }

  if (hasValue(body.additionalConditions)) {
    rows.push(['Additional conditions', body.additionalConditions ?? '']);
  }

  if (hasValue(body.propertyTitle)) {
    rows.push(['Property title', body.propertyTitle ?? '']);
  }

  if (hasValue(body.propertyAddress)) {
    rows.push(['Property address', body.propertyAddress ?? '']);
  }

  rows.push(['Property ID', body.propertyId ?? '']);

  if (hasValue(body.message)) {
    rows.push(['Message', body.message ?? '']);
  }

  const additionalRows = Object.entries(body)
    .filter(
      ([key]) =>
        ![
          'name',
          'email',
          'phone',
          'offerAmount',
          'propertyId',
          'message',
          'propertyTitle',
          'propertyAddress',
          'frequency',
          'depositAmount',
          'address',
          'moveInDate',
          'desiredMoveInDate',
          'householdSize',
          'partySize',
          'hasPets',
          'employmentStatus',
          'referencingConsent',
          'consentToReference',
          'proofOfFunds',
          'additionalConditions',
          'conditions',
          'specialConditions',
        ].includes(key)
    )
    .map(([key, value]) => [key, value]);

  const allRows = [...rows, ...additionalRows]
    .map(
      ([label, value]) =>
        `<tr><th align="left" style="padding:4px 8px;background:#f7f7f7;border:1px solid #ddd;">${escapeHtml(
          label,
        )}</th><td style="padding:4px 8px;border:1px solid #ddd;">${escapeHtml(value)}</td></tr>`,
    )
    .join('');

  return `
    <h2 style="font-family:Arial,sans-serif;">${escapeHtml(FORM_TITLE)}</h2>
    <table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">${allRows}</table>
  `;
}

function resolveSubject(body: FormBody): string {
  if (body.propertyId) {
    return `Offer for ${body.propertyId}: ${hasValue(body.offerAmount) ? formatCurrency(body.offerAmount) : 'N/A'}`;
  }

  return SUBJECT;
}

function resolveReplyTo(email: unknown): string | undefined {
  if (typeof email !== 'string') {
    return undefined;
  }

  const trimmed = email.trim();
  return trimmed.includes('@') ? trimmed : undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  let body: FormBody;

  try {
    body = normaliseBody(req);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request body' });
    return;
  }

  try {
    const { data, errors } = validateBody(body);
    if (!data || errors) {
      res.status(400).json({
        error: 'Invalid request body',
        details: errors,
      });
      return;
    }

    const offer = await addOffer({
      propertyId: data.propertyId,
      propertyTitle: data.propertyTitle,
      propertyAddress: data.propertyAddress,
      offerAmount: data.offerAmount,
      frequency: data.frequency,
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.message,
      depositAmount: data.depositAmount,
      contactId: undefined,
      agentId: undefined,
      moveInDate: data.moveInDate,
      householdSize: data.householdSize,
      hasPets: data.hasPets,
      employmentStatus: data.employmentStatus,
      referencingConsent: data.referencingConsent,
      proofOfFunds: data.proofOfFunds,
      additionalConditions: data.additionalConditions,
    });

    const emailBody: FormBody = {
      ...body,
      propertyId: data.propertyId,
      propertyTitle: data.propertyTitle,
      propertyAddress: data.propertyAddress,
      offerAmount: offer.price ?? data.offerAmount,
      frequency: data.frequency,
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.message,
      depositAmount: offer.depositAmount,
      moveInDate: data.moveInDate,
      householdSize: data.householdSize,
      hasPets: data.hasPets,
      employmentStatus: data.employmentStatus,
      referencingConsent: data.referencingConsent,
      proofOfFunds: data.proofOfFunds,
      additionalConditions: data.additionalConditions,
    };

    await sendMailGraph({
      subject: resolveSubject(emailBody),
      html: buildHtml(emailBody),
      to: RECIPIENTS,
      replyTo: resolveReplyTo(data.email),
    });

    res.status(200).json({ offer });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to send email' });
  }
}
