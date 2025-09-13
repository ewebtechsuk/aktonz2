import dynamic from 'next/dynamic';
import styles from '../styles/MediaGallery.module.css';

const Slider = dynamic(() => import('react-slick'), { ssr: false });

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

function renderMedia(url, index, title) {
  if (!url) return null;
  const lower = url.toLowerCase();
  if (lower.match(/\.(mp4|webm|ogg)$/)) {
    return (
      <div key={index} className={styles.slide}>
        <video
          src={url}
          controls
          playsInline
          title={`${title || 'Property'} video ${index + 1}`}
        />
      </div>
    );
  }
  if (lower.includes('matterport.com')) {
    return (
      <div key={index} className={styles.slide}>
        <iframe
          src={url}
          allow="fullscreen; vr"
          allowFullScreen
          title={`${title || 'Property'} 3D tour ${index + 1}`}
        />
      </div>
    );
  }
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    const src = normalizeYouTube(url);
    return (
      <div key={index} className={styles.slide}>
        <iframe
          src={src}
          allow="fullscreen"
          allowFullScreen
          title={`${title || 'Property'} video ${index + 1}`}
        />
      </div>
    );
  }
  if (lower.includes('vimeo.com')) {
    const src = normalizeVimeo(url);
    return (
      <div key={index} className={styles.slide}>
        <iframe
          src={src}
          allow="fullscreen"
          allowFullScreen
          title={`${title || 'Property'} video ${index + 1}`}
        />
      </div>
    );
  }
  return (
    <div key={index} className={styles.slide}>
      <img
        src={url}
        alt={`${title || 'Property'} image ${index + 1}`}
      />
    </div>
  );
}

export default function MediaGallery({ images = [], media = [], title = '' }) {
  const items = [...media, ...images];
  if (items.length === 0) return null;

  const settings = {
    dots: true,
    arrows: true,
    infinite: true,
    slidesToShow: 1,
    slidesToScroll: 1,
  };

  return (
    <div className={styles.slider}>
      <Slider {...settings}>
        {items.map((url, i) => renderMedia(url, i, title))}
      </Slider>
    </div>
  );
}
