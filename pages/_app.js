import '../styles/globals.css';
import '../styles/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import '../styles/carousel.css';
import '../styles/leaflet.css';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ChatWidget from '../components/ChatWidget';
import { SessionProvider } from '../components/SessionProvider';

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const showHeader =
    !router.pathname.startsWith('/account') && !router.pathname.startsWith('/admin');

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <SessionProvider>
        {showHeader ? <Header /> : null}
        <Component {...pageProps} />
        <Footer />
        <ChatWidget />
      </SessionProvider>
    </>
  );
}
