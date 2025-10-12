'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Document, Page, pdfjs } from 'react-pdf';
import styles from './BrochureFlipbook.module.css';

const FlipBook = dynamic(() => import('react-pageflip'), { ssr: false });

try {
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdf.worker.min.js', import.meta.url).toString();
  }
} catch (error) {
  // eslint-disable-next-line no-console
  console.warn('Failed to configure PDF.js worker', error);
}

export default function BrochureFlipbook({ file, className = '' }) {
  const [numPages, setNumPages] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [isReady, setIsReady] = useState(false);

  const handleLoadSuccess = useCallback((pdf) => {
    setNumPages(pdf.numPages ?? 0);
    setLoadError(null);
    setIsReady(true);
  }, []);

  const handleLoadError = useCallback((error) => {
    setLoadError(error);
  }, []);

  useEffect(() => {
    setNumPages(null);
    setLoadError(null);
    setIsReady(false);
  }, [file]);

  const pages = useMemo(() => {
    if (!numPages) return [];
    return Array.from({ length: numPages }, (_, index) => index + 1);
  }, [numPages]);

  return (
    <div className={[styles.flipbookContainer, className].filter(Boolean).join(' ')}>
      <Document
        file={file}
        loading={
          <div role="status" className={styles.statusMessage}>
            Loading brochure pages…
          </div>
        }
        onLoadSuccess={handleLoadSuccess}
        onLoadError={handleLoadError}
      >
        {loadError ? (
          <div role="alert" className={styles.errorMessage}>
            We couldn’t load the brochure at the moment. Please download it instead.
          </div>
        ) : null}

        {isReady && pages.length > 0 ? (
          <FlipBook width={480} height={640} className={styles.flipbook} usePortrait>
            {pages.map((pageNumber) => (
              <article key={pageNumber} className={styles.flipPage} aria-label={`Page ${pageNumber}`}>
                <Page
                  pageNumber={pageNumber}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  width={480}
                  className={styles.pdfPage}
                />
              </article>
            ))}
          </FlipBook>
        ) : !loadError ? (
          <div role="status" className={styles.statusMessage}>
            Preparing flipbook…
          </div>
        ) : null}
      </Document>
      <noscript>
        <p className={styles.noscriptMessage}>
          JavaScript is disabled. You can <a href={file}>download the brochure</a> to view it offline.
        </p>
      </noscript>
    </div>
  );
}
