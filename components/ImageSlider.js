import dynamic from 'next/dynamic';
import Image from 'next/image';
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
            <Image
              src={src}
              alt={`${title || 'Property'} image ${i + 1}`}
              fill
              className={styles.image}
              referrerPolicy="no-referrer"
              sizes="(max-width: 768px) 100vw, 800px"
            />
          </div>
        ))}
      </Slider>
    </div>
  );
}

