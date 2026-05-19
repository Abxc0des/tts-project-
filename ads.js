/**
 * Google AdSense loader — runs only when adsenseClient is set in config.js.
 * See LAUNCH.md for setup steps.
 */
(function initAds() {
  const cfg = window.PDF_VOICE_CONFIG;
  if (!cfg?.adsenseClient) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${cfg.adsenseClient}`;
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);

  document.querySelectorAll('.ad-slot').forEach((slot) => {
    slot.classList.add('has-ad');
    slot.removeAttribute('aria-hidden');
  });

  script.onload = () => {
    document.querySelectorAll('.adsbygoogle').forEach((el) => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.warn('AdSense push failed', e);
      }
    });
  };
})();
