import { useEffect } from 'react';

export default function ChatWidget() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://embed.tawk.to/${process.env.NEXT_PUBLIC_TAWKTO_PROPERTY_ID}/default`;
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return null;
}
