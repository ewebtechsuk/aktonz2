let googleMapsScriptPromise = null;

export function loadGoogleMaps(apiKey) {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }

  const existingGoogle = window.google;
  if (existingGoogle?.maps?.places) {
    return Promise.resolve(existingGoogle);
  }

  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        'Google Maps API key is missing. Address autocomplete will be unavailable.'
      );
    }
    return Promise.resolve(null);
  }

  if (googleMapsScriptPromise) {
    return googleMapsScriptPromise;
  }

  googleMapsScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.maps?.places) {
        resolve(window.google);
      } else {
        reject(new Error('Google Maps script loaded without the places library.'));
      }
    };
    script.onerror = (error) => {
      script.remove();
      googleMapsScriptPromise = null;
      reject(error);
    };
    document.head.appendChild(script);
  });

  return googleMapsScriptPromise;
}
