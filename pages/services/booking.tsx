import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import styles from '../../styles/ServiceBooking.module.css';
import {
  findLandlordService,
  landlordServices,
} from '../../data/services/landlordServices';

type BookingStatus = 'idle' | 'success' | 'error';

type PhotoAttachment = {
  name: string;
  type: string;
  data: string;
};

interface BookingFormState {
  serviceSlug: string;
  propertyAddress: string;
  preferredDate: string;
  preferredTime: string;
  tenantName: string;
  tenantEmail: string;
  notes: string;
  photo?: PhotoAttachment | null;
}

const defaultFormState: BookingFormState = {
  serviceSlug: landlordServices[0]?.slug ?? '',
  propertyAddress: '',
  preferredDate: '',
  preferredTime: '',
  tenantName: '',
  tenantEmail: '',
  notes: '',
  photo: null,
};

async function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function ServiceBookingPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<BookingFormState>(defaultFormState);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: BookingStatus; message?: string }>(
    { type: 'idle' }
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const serviceQuery = router.query.service;

  useEffect(() => {
    if (typeof serviceQuery === 'string') {
      setFormData((prev) => ({ ...prev, serviceSlug: serviceQuery }));
    }
  }, [serviceQuery]);

  const selectedService = useMemo(() => {
    return (
      findLandlordService(formData.serviceSlug) || landlordServices[0] || null
    );
  }, [formData.serviceSlug]);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = async (
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) {
      setFormData((prev) => ({ ...prev, photo: null }));
      setPhotoPreview(null);
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setFormData((prev) => ({
        ...prev,
        photo: { name: file.name, type: file.type, data: base64 },
      }));
      setPhotoPreview(URL.createObjectURL(file));
    } catch (error) {
      console.error('Failed to read file', error);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: 'idle' });

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          serviceSlug: selectedService?.slug ?? formData.serviceSlug,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to create booking');
      }

      setStatus({ type: 'success', message: 'Booking created. Redirecting…' });
      if (payload?.paymentUrl) {
        setTimeout(() => {
          window.location.href = payload.paymentUrl as string;
        }, 900);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong';
      setStatus({ type: 'error', message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Book Landlord Services | Aktonz</title>
        <meta
          name="description"
          content="Reserve maintenance and compliance services online and pay securely."
        />
      </Head>
      <section className={styles.bookingSection}>
        <div className={styles.bookingContainer}>
          <div className={styles.bookingHeader}>
          <h1>Book &amp; Pay Online</h1>
          <p>
            Choose a service, tell us about the property, upload supporting
            photos and we will confirm your slot before taking payment securely.
          </p>
        </div>

        <form className={styles.bookingForm} onSubmit={handleSubmit}>
          <div className={styles.fieldGroup}>
            <label htmlFor="serviceSlug">Service</label>
            <select
              id="serviceSlug"
              name="serviceSlug"
              value={formData.serviceSlug}
              onChange={handleChange}
              required
            >
              {landlordServices.map((service) => (
                <option key={service.id} value={service.slug}>
                  {service.title}
                </option>
              ))}
            </select>
          </div>

          {selectedService && (
            <p>
              <strong>{selectedService.title}</strong> · {selectedService.priceRange}
              {' '}• {selectedService.duration}
            </p>
          )}

          <div className={styles.fieldGroup}>
            <label htmlFor="propertyAddress">Property Address</label>
            <textarea
              id="propertyAddress"
              name="propertyAddress"
              value={formData.propertyAddress}
              onChange={handleChange}
              placeholder="Street, town, postcode"
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="preferredDate">Preferred Date</label>
            <input
              type="date"
              id="preferredDate"
              name="preferredDate"
              value={formData.preferredDate}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="preferredTime">Preferred Time</label>
            <input
              type="time"
              id="preferredTime"
              name="preferredTime"
              value={formData.preferredTime}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="tenantName">Contact Name</label>
            <input
              type="text"
              id="tenantName"
              name="tenantName"
              value={formData.tenantName}
              onChange={handleChange}
              placeholder="e.g. Main tenant or site contact"
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="tenantEmail">Contact Email</label>
            <input
              type="email"
              id="tenantEmail"
              name="tenantEmail"
              value={formData.tenantEmail}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="notes">Notes / Access Details</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Let us know about alarm panels, parking or access instructions"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="photo">Optional photo upload</label>
            <input type="file" id="photo" accept="image/*" onChange={handlePhotoChange} />
            {photoPreview && (
              <div className={styles.photoPreview}>
                <img src={photoPreview} alt="Upload preview" />
              </div>
            )}
          </div>

          <div className={styles.formActions}>
            <button className={styles.submitButton} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting…' : 'Submit &amp; Continue to Payment'}
            </button>
            {status.type !== 'idle' && (
              <span className={styles.statusMessage}>{status.message}</span>
            )}
          </div>
        </form>
      </div>
    </section>
    </>
  );
}
