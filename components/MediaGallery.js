import dynamic from 'next/dynamic';
import Image from 'next/image';
import styles from '../styles/MediaGallery.module.css';

const Carousel = dynamic(
  () => import('react-responsive-carousel').then((m) => m.Carousel),
  { ssr: false }
);

function normalizeYouTube(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (u.pathname.startsWith('/embed/')) return url;
    }
  } catch {}
  return url;
}

function normalizeVimeo(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      return `https://player.vimeo.com/video/${id}`;
    }
  } catch {}
  return url;
}

function renderMedia(url, index) {
  if (!url) return null;
  const lower = url.toLowerCase();
  if (lower.match(/\.(mp4|webm|ogg)$/)) {
    return (
      <div key={index} className={styles.slide}>
        <video src={url} controls playsInline />
      </div>
    );
  }
  if (lower.includes('matterport.com')) {
    return (
      <div key={index} className={styles.slide}>
        <iframe src={url} allow="fullscreen; vr" allowFullScreen />
      </div>
    );
  }
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    const src = normalizeYouTube(url);
    return (
      <div key={index} className={styles.slide}>
        <iframe src={src} allow="fullscreen" allowFullScreen />
      </div>
    );
  }
  if (lower.includes('vimeo.com')) {
    const src = normalizeVimeo(url);
    return (
      <div key={index} className={styles.slide}>
        <iframe src={src} allow="fullscreen" allowFullScreen />
      </div>
    );
  }
  return (
    <div key={index} className={styles.slide}>
      <div className={styles.imageFrame}>
        <Image
          src={url}
          alt={`Property media item ${index + 1}`}
          fill
          sizes="(max-width: 767px) 100vw, (max-width: 959px) 90vw, 780px"
          className={styles.image}
          priority={index === 0}
        />
      </div>
    </div>
  );
}

export default function MediaGallery({ images = [], media = [] }) {
  const items = [...media, ...images];
  if (items.length === 0) return null;
  return (
    <div className={styles.slider} aria-label="Property media gallery">
      <Carousel
        showThumbs={false}
        showArrows
        swipeable
        emulateTouch
        useKeyboardArrows
        showIndicators={false}
      >
        {items.map((url, i) => renderMedia(url, i))}
      </Carousel>
    </div>
  );
}
