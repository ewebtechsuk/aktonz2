import '../styles/globals.css';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ChatWidget from '../components/ChatWidget';
import { appWithTranslation } from 'next-i18next';
import nextI18NextConfig from '../next-i18next.config.mjs';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Header />
      <Component {...pageProps} />
      <Footer />
      <ChatWidget />
    </>
  );
}

export default appWithTranslation(MyApp, nextI18NextConfig);
