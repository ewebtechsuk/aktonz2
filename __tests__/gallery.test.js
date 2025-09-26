const createEnoentError = () => {
  const error = new Error('Missing file');
  error.code = 'ENOENT';
  return error;
};

describe('gallery data loader', () => {
  afterEach(() => {
    jest.resetModules();
  });

  test('falls back to empty gallery when the data file is missing', async () => {
    const readFile = jest.fn().mockRejectedValue(createEnoentError());

    await jest.isolateModulesAsync(async () => {
      jest.unstable_mockModule('node:fs/promises', () => ({
        readFile,
      }));
      const { getGalleryOverview, getGalleryItemById, resetGalleryCache } = await import('../lib/gallery.mjs');
      await resetGalleryCache();

      const overview = await getGalleryOverview();
      expect(overview.available).toBe(false);
      expect(overview.sections).toEqual([]);
      expect(readFile).toHaveBeenCalled();

      const fallback = await getGalleryItemById('pre-appointment-presentations/meet-your-valuer');
      expect(fallback).toEqual({
        id: 'pre-appointment-presentations/meet-your-valuer',
        order: null,
        category: null,
        categorySlug: null,
        title: null,
        slide: null,
        agency: null,
        thumbnailUrl: null,
        presentationUrl: null,
      });
    });
  });

  test('loads gallery sections when data is available', async () => {
    const sample = JSON.stringify([
      {
        category: 'Pre appointment presentations',
        slug: 'pre-appointment-presentations',
        items: [
          {
            title: 'Meet Your Valuer',
            slide: 'Meet Your Valuer',
            agency: 'Webbers New',
            presentationUrl: 'https://example.com/presentation',
            thumbnailUrl: 'https://example.com/thumbnail.jpg',
          },
        ],
      },
    ]);

    const readFile = jest.fn().mockResolvedValue(sample);

    await jest.isolateModulesAsync(async () => {
      jest.unstable_mockModule('node:fs/promises', () => ({
        readFile,
      }));
      const { getGalleryOverview, getGalleryItemById, resetGalleryCache } = await import('../lib/gallery.mjs');
      await resetGalleryCache();

      const overview = await getGalleryOverview();
      expect(overview.available).toBe(true);
      expect(overview.sections).toHaveLength(1);
      expect(overview.sections[0].items).toHaveLength(1);

      const item = await getGalleryItemById('pre-appointment-presentations/meet-your-valuer');
      expect(item).toMatchObject({
        id: 'pre-appointment-presentations/meet-your-valuer',
        category: 'Pre appointment presentations',
        title: 'Meet Your Valuer',
      });
    });
  });
});
