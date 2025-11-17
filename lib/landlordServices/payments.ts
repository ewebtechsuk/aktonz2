export interface PaymentSession {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid';
  checkoutUrl: string;
  createdAt: string;
  serviceName?: string;
  customerEmail?: string;
}

const paymentSessions: PaymentSession[] = [];

function resolveSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

export function createPaymentSession(params: {
  bookingId: string;
  amount: number;
  currency?: string;
  serviceName?: string;
  customerEmail?: string;
}) {
  const { bookingId, amount, currency = 'GBP', serviceName, customerEmail } = params;

  const session: PaymentSession = {
    id: `pay_${Date.now().toString(36)}`,
    bookingId,
    amount,
    currency,
    status: 'pending',
    checkoutUrl: `${resolveSiteUrl()}/services/booking?bookingId=${bookingId}&step=payment`,
    createdAt: new Date().toISOString(),
    serviceName,
    customerEmail,
  };

  paymentSessions.push(session);
  return session;
}

export function listPaymentSessions() {
  return paymentSessions;
}
