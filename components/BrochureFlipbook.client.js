'use client';

import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './BrochureFlipbook.module.css';

const PDFJS_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.9.155/build/pdf.min.js';
const PDFJS_WORKER_SRC = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.9.155/build/pdf.worker.min.js';

let pdfjsLoaderPromise;

function loadPdfjs() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('PDF.js can only be loaded in the browser.'));
  }

  if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
    return Promise.resolve(window.pdfjsLib);
  }

  if (!pdfjsLoaderPromise) {
    pdfjsLoaderPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${PDFJS_SCRIPT_SRC}"]`);

      const resolvePdfjsLib = () => {
        const lib = window.pdfjsLib ?? window['pdfjs-dist/build/pdf'];
        if (lib && lib.GlobalWorkerOptions) {
          lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
          if (!window.pdfjsLib) {
            window.pdfjsLib = lib;
          }
          resolve(lib);
          return;
        }
        reject(new Error('PDF.js failed to initialise.'));
      };

      const handleReady = () => {
        try {
          resolvePdfjsLib();
        } catch (error) {
          reject(error);
        }
      };

      if (existingScript) {
        if (window.pdfjsLib || window['pdfjs-dist/build/pdf']) {
          handleReady();
        } else {
          existingScript.addEventListener('load', handleReady, { once: true });
          existingScript.addEventListener('error', () => reject(new Error('Failed to load PDF.js script.')), {
            once: true,
          });
        }
        return;
      }

      const script = document.createElement('script');
      script.src = PDFJS_SCRIPT_SRC;
      script.async = true;
      script.addEventListener('load', handleReady, { once: true });
      script.addEventListener('error', () => reject(new Error('Failed to load PDF.js script.')), { once: true });
      document.head.appendChild(script);
    }).catch((error) => {
      pdfjsLoaderPromise = undefined;
      throw error;
    });
  }

  return pdfjsLoaderPromise;
}

const TARGET_WIDTH = 480;

function PageCanvas({ pdf, pageNumber, onDimensions }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!pdf) return undefined;

    let isCancelled = false;
    let renderTask;

    const renderPage = async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (isCancelled) return;

        const unscaledViewport = page.getViewport({ scale: 1 });
        const scale = TARGET_WIDTH / unscaledViewport.width;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        renderTask = page.render({ canvasContext: context, viewport });
        await renderTask.promise;
        onDimensions?.({ width: viewport.width, height: viewport.height });
      } catch (error) {
        if (!isCancelled) {
          console.error(`Failed to render brochure page ${pageNumber}`, error);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdf, pageNumber, onDimensions]);

  return <canvas ref={canvasRef} className={styles.pdfCanvas} aria-label={`Brochure page ${pageNumber}`} />;
}

export default function BrochureFlipbook({ file, className = '' }) {
  const router = useRouter();
  const resolvedFile = useMemo(() => {
    if (!file) return file;
    if (/^(?:https?:|data:)/.test(file)) {
      return file;
    }

    const base = router?.basePath ?? '';
    if (!base) {
      return file;
    }

    if (file.startsWith(base)) {
      return file;
    }

    if (file.startsWith('/')) {
      return `${base}${file}`;
    }

    return `${base}/${file}`;
  }, [file, router?.basePath]);

  const [pdfDocument, setPdfDocument] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageDimensions, setPageDimensions] = useState({ width: TARGET_WIDTH, height: Math.round(TARGET_WIDTH * 1.333) });
  const [currentSpread, setCurrentSpread] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    let loadingTask;

    const loadDocument = async () => {
      setIsLoading(true);
      setLoadError(null);
      setPdfDocument(null);

      try {
        const pdfjs = await loadPdfjs();
        loadingTask = pdfjs.getDocument(resolvedFile);
        const pdf = await loadingTask.promise;
        if (isCancelled) {
          await pdf.destroy();
          return;
        }
        setPdfDocument(pdf);
      } catch (error) {
        if (!isCancelled) {
          setLoadError(error);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadDocument();

    return () => {
      isCancelled = true;
      if (loadingTask) {
        loadingTask.destroy();
      }
    };
  }, [resolvedFile]);

  useEffect(() => {
    return () => {
      if (pdfDocument) {
        pdfDocument.destroy();
      }
    };
  }, [pdfDocument]);

  const pageNumbers = useMemo(() => {
    if (!pdfDocument?.numPages) return [];
    return Array.from({ length: pdfDocument.numPages }, (_, index) => index + 1);
  }, [pdfDocument]);

  const spreads = useMemo(() => {
    if (pageNumbers.length === 0) return [];
    const grouped = [];
    for (let index = 0; index < pageNumbers.length; index += 2) {
      grouped.push([pageNumbers[index], pageNumbers[index + 1] ?? null]);
    }
    return grouped;
  }, [pageNumbers]);

  const handleDimensions = useCallback((dimensions) => {
    setPageDimensions((previous) => {
      if (previous.width === dimensions.width && previous.height === dimensions.height) {
        return previous;
      }
      return dimensions;
    });
  }, []);

  const isReady = pageNumbers.length > 0 && !isLoading && !loadError;
  const totalPages = pageNumbers.length;
  const totalSpreads = spreads.length;
  const currentPages = spreads[currentSpread] ?? [];
  const firstVisiblePage = currentPages[0] ?? 1;
  const lastVisiblePage = currentPages[1] ?? currentPages[0] ?? 1;

  const goToPrevious = useCallback(() => {
    setCurrentSpread((index) => Math.max(index - 1, 0));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentSpread((index) => Math.min(index + 1, Math.max(totalSpreads - 1, 0)));
  }, [totalSpreads]);

  useEffect(() => {
    setCurrentSpread(0);
  }, [totalSpreads]);

  return (
    <div className={[styles.flipbookContainer, className].filter(Boolean).join(' ')}>
      {isLoading && !loadError ? (
        <div role="status" className={styles.statusMessage}>
          Loading brochure pages…
        </div>
      ) : null}

      {!isLoading && loadError ? (
        <div role="alert" className={styles.errorMessage}>
          We couldn’t load the brochure at the moment. Please download it instead.
        </div>
      ) : null}

      {isReady ? (
        <div className={styles.viewerShell}>
          <div
            className={styles.spreadViewport}
            style={{ minHeight: pageDimensions.height, maxWidth: pageDimensions.width * (currentPages.length === 1 ? 1 : 2) }}
          >
            <div className={styles.spread}>
              {currentPages.map((pageNumber, position) => (
                pageNumber ? (
                  <article
                    key={pageNumber}
                    className={[
                      styles.page,
                      position === 0 ? styles.leftPage : styles.rightPage,
                    ].join(' ')}
                    aria-label={`Page ${pageNumber}`}
                  >
                    <PageCanvas
                      pdf={pdfDocument}
                      pageNumber={pageNumber}
                      onDimensions={pageNumber === 1 ? handleDimensions : undefined}
                    />
                  </article>
                ) : (
                  <article key={`blank-${position}`} className={[styles.page, styles.blankPage].join(' ')} aria-hidden="true" />
                )
              ))}
            </div>
          </div>

          <div className={styles.viewerControls}>
            <button
              type="button"
              className={styles.viewerButton}
              onClick={goToPrevious}
              disabled={currentSpread === 0}
            >
              Previous
            </button>
            <p className={styles.viewerMeta}>
              Viewing pages {firstVisiblePage}
              {lastVisiblePage && lastVisiblePage !== firstVisiblePage ? `–${lastVisiblePage}` : ''} of {totalPages}
            </p>
            <button
              type="button"
              className={styles.viewerButton}
              onClick={goToNext}
              disabled={currentSpread >= totalSpreads - 1}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      <noscript>
        <p className={styles.noscriptMessage}>
          JavaScript is disabled. You can <a href={file}>download the brochure</a> to view it offline.
        </p>
      </noscript>
    </div>
  );
}
