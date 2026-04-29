export function LandingPage() {
  return (
    <section className="page landing-page">
      <header className="landing-hero">
        <h1>EsnafOS</h1>
        <p>Küçük işletmeler için basit veresiye ve satış yönetimi</p>
        <button type="button" className="download-button" disabled>
          İndir (Yakında)
        </button>
      </header>

      <section className="landing-section" aria-labelledby="features-title">
        <h2 id="features-title">Özellikler</h2>
        <ul>
          <li>Veresiye takibi</li>
          <li>Satış kaydı</li>
          <li>Müşteri yönetimi</li>
          <li>Kasa özeti</li>
          <li>Offline çalışma</li>
        </ul>
      </section>

      <section className="landing-section" aria-labelledby="about-title">
        <h2 id="about-title">EsnafOS Nedir?</h2>
        <p>
          EsnafOS, küçük işletmeler için geliştirilmiş ücretsiz bir masaüstü
          uygulamadır.
        </p>
      </section>

      <section className="landing-section" aria-labelledby="download-title">
        <h2 id="download-title">İndirme</h2>
        <div className="download-grid">
          <div className="download-card">
            <h3>Mac</h3>
            <p>yakında</p>
          </div>
          <div className="download-card">
            <h3>Windows</h3>
            <p>yakında</p>
          </div>
        </div>
      </section>

      <section className="landing-section" aria-labelledby="cta-title">
        <h2 id="cta-title">Geri Bildirim</h2>
        <a
          href="https://github.com/esnafos/esnafos/issues"
          target="_blank"
          rel="noreferrer"
          className="feedback-link"
        >
          Geri bildirim gönder
        </a>
      </section>

      <footer className="landing-footer">
        <a href="https://github.com/esnafos/esnafos" target="_blank" rel="noreferrer">
          GitHub
        </a>
        <span>v0.1.0 (alpha)</span>
      </footer>
    </section>
  );
}
