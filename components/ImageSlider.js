import { useState } from 'react';
import styles from '../styles/ImageSlider.module.css';

export default function ImageSlider({ images = [], imgStyle = {} }) {
  const [index, setIndex] = useState(0);
  if (!images || images.length === 0) return null;

  const prev = () => setIndex((index - 1 + images.length) % images.length);
  const next = () => setIndex((index + 1) % images.length);

  return (
    <div className={styles.slider}>
      <img
        src={images[index]}
        alt={`Property image ${index + 1}`}
        style={imgStyle}
      />
      {images.length > 1 && (
        <>
          <button className={styles.prev} onClick={prev} aria-label="Previous image">
            &#10094;
          </button>
          <button className={styles.next} onClick={next} aria-label="Next image">
            &#10095;
          </button>
        </>
      )}
    </div>
  );
}
