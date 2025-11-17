import type { NextApiRequest, NextApiResponse } from 'next';

import {
  findLandlordService,
  landlordServices,
} from '../../data/services/landlordServices';
import { createPaymentSession } from '../../lib/landlordServices/payments';

type BookingRecord = {
  id: string;
  serviceSlug: string;
  serviceName: string;
  propertyAddress: string;
  preferredDate: string;
  preferredTime: string;
  tenantName: string;
  tenantEmail: string;
  notes?: string;
  photo?: { name: string; type: string; data: string } | null;
  status: 'pending-payment' | 'confirmed';
  createdAt: string;
};

const bookings: BookingRecord[] = [];

function validatePayload(body: NextApiRequest['body']) {
  const requiredFields = [
    'serviceSlug',
    'propertyAddress',
    'preferredDate',
    'preferredTime',
    'tenantName',
    'tenantEmail',
  ];

  for (const field of requiredFields) {
    if (!body?.[field]) {
      return `Missing field: ${field}`;
    }
  }

  const service = findLandlordService(body.serviceSlug);
  if (!service) {
    return 'Invalid service selected';
  }

  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const validationError = validatePayload(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const service = findLandlordService(req.body.serviceSlug)!;
  const booking: BookingRecord = {
    id: `bk_${Date.now().toString(36)}`,
    serviceSlug: service.slug,
    serviceName: service.title,
    propertyAddress: req.body.propertyAddress,
    preferredDate: req.body.preferredDate,
    preferredTime: req.body.preferredTime,
    tenantName: req.body.tenantName,
    tenantEmail: req.body.tenantEmail,
    notes: req.body.notes,
    photo: req.body.photo ?? null,
    status: 'pending-payment',
    createdAt: new Date().toISOString(),
  };

  bookings.push(booking);

  const paymentSession = createPaymentSession({
    bookingId: booking.id,
    amount: service.priceFrom,
    currency: 'GBP',
    serviceName: service.title,
    customerEmail: booking.tenantEmail,
  });

  return res.status(200).json({
    bookingId: booking.id,
    booking,
    paymentUrl: paymentSession.checkoutUrl,
    services: landlordServices,
  });
}
