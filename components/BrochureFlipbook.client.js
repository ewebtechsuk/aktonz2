'use client';

import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './BrochureFlipbook.module.css';

const PDFJS_SOURCES = [
  {
    script: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
    worker: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js',
  },
  {
    script: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    worker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  },
];

let activePdfjsSourceIndex;

let pdfjsLoaderPromise;

function configurePdfjsWorker(pdfjs, workerSrc) {
  if (pdfjs?.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    if (typeof pdfjs.disableWorker === 'boolean') {
      pdfjs.disableWorker = false;
    }
  }
}

function getPdfjsLibFromWindow() {
  const lib = window.pdfjsLib ?? window['pdfjs-dist/build/pdf'];
  if (lib && !window.pdfjsLib) {
    window.pdfjsLib = lib;
  }
  return lib;
}

function loadPdfjs() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('PDF.js can only be loaded in the browser.'));
  }

  if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
    const source =
      typeof activePdfjsSourceIndex === 'number'
        ? PDFJS_SOURCES[activePdfjsSourceIndex] ?? PDFJS_SOURCES[0]
        : PDFJS_SOURCES[0];
    configurePdfjsWorker(window.pdfjsLib, source.worker);
    return Promise.resolve(window.pdfjsLib);
  }

  if (!pdfjsLoaderPromise) {
    pdfjsLoaderPromise = new Promise((resolve, reject) => {
      let isSettled = false;

      const attemptLoad = (index) => {
        if (isSettled) {
          return;
        }

        if (index >= PDFJS_SOURCES.length) {
          isSettled = true;
          reject(new Error('Failed to load PDF.js script.'));
          return;
        }

        const source = PDFJS_SOURCES[index];
        const selector = `script[data-pdfjs-loader="${index}"]`;
        let script = document.querySelector(selector);

        const cleanupListeners = () => {
          if (!script) return;
          script.removeEventListener('load', handleReady);
          script.removeEventListener('error', handleError);
        };

        const handleReady = () => {
          if (isSettled) return;
          try {
            const lib = getPdfjsLibFromWindow();
            if (!lib || !lib.GlobalWorkerOptions) {
              throw new Error('PDF.js failed to initialise.');
            }
            activePdfjsSourceIndex = index;
            configurePdfjsWorker(lib, source.worker);
            isSettled = true;
            cleanupListeners();
            resolve(lib);
          } catch (error) {
            cleanupListeners();
            if (script && !script.dataset.pdfjsKeep) {
              script.remove();
              script = null;
            }
            attemptLoad(index + 1);
          }
        };

        const handleError = () => {
          if (isSettled) return;
          cleanupListeners();
          if (script && !script.dataset.pdfjsKeep) {
            script.remove();
            script = null;
          }
          attemptLoad(index + 1);
        };

        if (script) {
          script.addEventListener('load', handleReady, { once: true });
          script.addEventListener('error', handleError, { once: true });
          if (window.pdfjsLib || window['pdfjs-dist/build/pdf']) {
            handleReady();
          }
          return;
        }

        script = document.createElement('script');
        script.src = source.script;
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.dataset.pdfjsLoader = String(index);
        script.addEventListener('load', handleReady, { once: true });
        script.addEventListener('error', handleError, { once: true });
        document.head.appendChild(script);
      };

      attemptLoad(0);
    }).catch((error) => {
      pdfjsLoaderPromise = undefined;
      throw error;
    });
  }

  return pdfjsLoaderPromise;
}

function isPdfWorkerBootstrapError(error) {
  if (!error) return false;
  const message = typeof error === 'string' ? error : error?.message ?? '';
  if (!message) return false;
  return (
    message.includes('Setting up fake worker failed') ||
    message.includes('Cannot load script') ||
    message.includes('Worker is disabled')
  );
}

async function openPdfDocument(source, { disableWorker = false } = {}) {
  const pdfjs = await loadPdfjs();

  if (pdfjs.GlobalWorkerOptions) {
    if (disableWorker) {
      pdfjs.GlobalWorkerOptions.workerSrc = null;
      if (typeof pdfjs.disableWorker === 'boolean') {
        pdfjs.disableWorker = true;
      }
    } else {
      const source =
        typeof activePdfjsSourceIndex === 'number'
          ? PDFJS_SOURCES[activePdfjsSourceIndex] ?? PDFJS_SOURCES[0]
          : PDFJS_SOURCES[0];
      configurePdfjsWorker(pdfjs, source.worker);
    }
  }

  const loadingTask = pdfjs.getDocument(source);

  try {
    const pdf = await loadingTask.promise;
    return { pdf, loadingTask };
  } catch (error) {
    if (typeof loadingTask.destroy === 'function') {
      loadingTask.destroy();
    }
    throw error;
  }
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

      let attemptDisableWorker = false;

      while (!isCancelled) {
        loadingTask = undefined;
        try {
          const { pdf, loadingTask: task } = await openPdfDocument(resolvedFile, {
            disableWorker: attemptDisableWorker,
          });
          loadingTask = task;
          if (isCancelled) {
            await pdf.destroy();
            return;
          }
          setPdfDocument(pdf);
          break;
        } catch (error) {
          if (!attemptDisableWorker && isPdfWorkerBootstrapError(error)) {
            if (typeof window !== 'undefined') {
              console.warn('PDF worker failed to start; retrying with worker disabled.', error);
            }
            attemptDisableWorker = true;
            continue;
          }
          if (!isCancelled) {
            setLoadError(error);
          }
          break;
        }
      }

      if (!isCancelled) {
        setIsLoading(false);
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
