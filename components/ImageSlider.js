import dynamic from 'next/dynamic';
import styles from '../styles/ImageSlider.module.css';

const Slider = dynamic(() => import('react-slick'), { ssr: false });

export default function ImageSlider({ images = [], title = '' }) {
  if (!images || images.length === 0) return null;

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
        {images.map((src, i) => (
          <div key={i} className={styles.slide}>
            <img
              src={src}
              alt={`${title || 'Property'} image ${i + 1}`}
              loading={i === 0 ? 'eager' : 'lazy'}

            />
          </div>
        ))}
      </Slider>
    </div>
  );
}

