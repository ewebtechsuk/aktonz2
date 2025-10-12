'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import styles from './BrochureFlipbook.module.css';

const FlipBook = dynamic(() => import('react-pageflip').then((mod) => mod.HTMLFlipBook ?? mod.default), {
  ssr: false,
});

if (typeof window !== 'undefined' && !GlobalWorkerOptions.workerSrc) {
  try {
    GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString();
  } catch (error) {
    console.warn('Failed to configure PDF.js worker', error);
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
  const [pdfDocument, setPdfDocument] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageDimensions, setPageDimensions] = useState({ width: TARGET_WIDTH, height: Math.round(TARGET_WIDTH * 1.333) });

  useEffect(() => {
    let isCancelled = false;
    let loadingTask;

    const loadDocument = async () => {
      setIsLoading(true);
      setLoadError(null);
      setPdfDocument(null);

      try {
        loadingTask = getDocument(file);
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
  }, [file]);

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

  const handleDimensions = useCallback((dimensions) => {
    setPageDimensions((previous) => {
      if (previous.width === dimensions.width && previous.height === dimensions.height) {
        return previous;
      }
      return dimensions;
    });
  }, []);

  const isReady = pageNumbers.length > 0 && !isLoading && !loadError;

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
        <FlipBook
          width={pageDimensions.width}
          height={pageDimensions.height}
          className={styles.flipbook}
          usePortrait
        >
          {pageNumbers.map((pageNumber) => (
            <article key={pageNumber} className={styles.flipPage} aria-label={`Page ${pageNumber}`}>
              <PageCanvas
                pdf={pdfDocument}
                pageNumber={pageNumber}
                onDimensions={pageNumber === 1 ? handleDimensions : undefined}
              />
            </article>
          ))}
        </FlipBook>
      ) : null}

      <noscript>
        <p className={styles.noscriptMessage}>
          JavaScript is disabled. You can <a href={file}>download the brochure</a> to view it offline.
        </p>
      </noscript>
    </div>
  );
}
