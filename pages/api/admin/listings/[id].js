import {
  AdminListingValidationError,
  getLettingsListingById,
  serializeListing,
  updateLettingsListingById,
} from '../../../../lib/admin-listings.mjs';
import { getAdminFromSession } from '../../../../lib/admin-users.mjs';
import { readSession } from '../../../../lib/session.js';
import { listOffersForAdmin } from '../../../../lib/offers-admin.mjs';
import { listMaintenanceTasksForAdmin } from '../../../../lib/maintenance-admin.mjs';
import { normalizePropertyIdentifierForComparison } from '../../../../lib/property-id.mjs';

function requireAdmin(req, res) {
  const session = readSession(req);
  const admin = getAdminFromSession(session);

  if (!admin) {
    res.status(401).json({ error: 'Admin authentication required' });
    return null;
  }

  return admin;
}

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) {
    return;
  }

  if (req.method === 'HEAD') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'PATCH') {
    res.setHeader('Allow', ['GET', 'PATCH', 'HEAD']);
    res.status(405).end('Method Not Allowed');
    return;
  }

  const { id } = req.query;
  const listingId = Array.isArray(id) ? id[0] : id;

  if (!listingId) {
    res.status(400).json({ error: 'Listing id is required' });
    return;
  }

  if (req.method === 'GET') {
    try {
      const listing = await getLettingsListingById(listingId);
      if (!listing) {
        res.status(404).json({ error: 'Listing not found' });
        return;
      }

      const serialized = serializeListing(listing);
      const comparisonIds = new Set();

      const registerId = (value) => {
        const normalized = normalizePropertyIdentifierForComparison(value);
        if (normalized) {
          comparisonIds.add(normalized);
        }
      };

      registerId(listingId);
      registerId(serialized.id);
      registerId(serialized.reference);
      registerId(listing?.raw?.id);
      registerId(listing?.raw?.externalId);
      registerId(listing?.raw?.externalReference);
      registerId(listing?.raw?.sourceId);
      registerId(listing?.raw?.fullReference);

      const [offersResult, maintenanceResult] = await Promise.allSettled([
        listOffersForAdmin(),
        listMaintenanceTasksForAdmin(),
      ]);

      if (offersResult.status === 'rejected') {
        console.error('Failed to load offers for admin listing', listingId, offersResult.reason);
      }
      if (maintenanceResult.status === 'rejected') {
        console.error(
          'Failed to load maintenance tasks for admin listing',
          listingId,
          maintenanceResult.reason,
        );
      }

      const offers = offersResult.status === 'fulfilled' ? offersResult.value : [];
      const maintenance =
        maintenanceResult.status === 'fulfilled' ? maintenanceResult.value : [];

      const matchesListing = (candidates = []) => {
        for (const candidate of candidates) {
          const normalized = normalizePropertyIdentifierForComparison(candidate);
          if (normalized && comparisonIds.has(normalized)) {
            return true;
          }
        }
        return false;
      };

      const linkedOffers = offers.filter((offer) =>
        matchesListing([
          offer.property?.id,
          offer.property?.reference,
          offer.property?.externalReference,
          offer.property?.sourceId,
          offer.propertyId,
        ]),
      );

      const linkedMaintenance = maintenance.filter((task) =>
        matchesListing([
          task.property?.id,
          task.property?.reference,
          task.property?.externalReference,
        ]),
      );

      res.status(200).json({
        listing: {
          ...serialized,
          offers: linkedOffers,
          maintenanceTasks: linkedMaintenance,
        },
      });
    } catch (error) {
      console.error('Failed to load admin listing by id', listingId, error);
      res.status(500).json({ error: 'Failed to load listing' });
    }
    return;
  }

  if (req.method === 'PATCH') {
    try {
      const updates = req.body && typeof req.body === 'object' ? req.body : {};
      const listing = await updateLettingsListingById(listingId, updates);

      if (!listing) {
        res.status(404).json({ error: 'Listing not found' });
        return;
      }

      res.status(200).json({ listing: serializeListing(listing, { includeRaw: true, includeApexFields: true }) });
    } catch (error) {
      if (error instanceof AdminListingValidationError) {
        res.status(400).json({ error: error.message, details: error.messages });
        return;
      }

      console.error('Failed to update admin listing', listingId, error);
      res.status(500).json({ error: 'Failed to update listing' });
    }
  }
}
