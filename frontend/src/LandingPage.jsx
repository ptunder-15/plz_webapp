import React, { useState, useEffect } from 'react';

export default function LandingPage() {
  const [introStage, setIntroStage] = useState(0); 
  const [showImpressum, setShowImpressum] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setIntroStage(1), 1600); 
    const timer2 = setTimeout(() => setIntroStage(2), 2200); 
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        /* Premium Webfont Import */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        /* Reset um graue Striche und Ränder zu killen */
        #root {
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          text-align: left !important;
          background-color: #ffffff !important;
        }

        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100vh;
          background-color: #ffffff;
          overflow-x: hidden;
          /* Inter als primäre Schriftart gesetzt */
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #111111;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        * { box-sizing: border-box; }

        .sg-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
        }

        /* --- LOGO ANIMATION --- */
        .sg-brand-wrapper {
          position: fixed;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          transition: top 1.2s cubic-bezier(0.86, 0, 0.07, 1),
                      left 1.2s cubic-bezier(0.86, 0, 0.07, 1),
                      transform 1.2s cubic-bezier(0.86, 0, 0.07, 1);
        }

        .sg-brand-inner {
          display: flex;
          flex-direction: column;
          transition: align-items 0.4s ease;
        }

        .sg-brand-wrapper.stage-0,
        .sg-brand-wrapper.stage-1 {
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) scale(2.2);
        }
        .sg-brand-wrapper.stage-0 .sg-brand-inner,
        .sg-brand-wrapper.stage-1 .sg-brand-inner { align-items: center; }

        .sg-brand-wrapper.stage-2 {
          top: 24px;
          left: 5%; 
          transform: translate(0, 0) scale(1);
        }
        .sg-brand-wrapper.stage-2 .sg-brand-inner { align-items: flex-start; }

        .sg-welcome-text {
          font-size: 8px;
          font-weight: 600;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: #888891;
          margin-bottom: 8px;
          transition: opacity 0.6s ease, transform 0.6s ease, height 0.6s ease, margin 0.6s ease;
          opacity: 1;
          transform: translateY(0);
          height: 12px;
        }

        .stage-1 .sg-welcome-text,
        .stage-2 .sg-welcome-text {
          opacity: 0;
          transform: translateY(-5px);
          height: 0;
          margin-bottom: 0;
        }

        .sg-brand-name {
          font-size: 22px;
          font-weight: 700;
          color: #111111;
          line-height: 1;
          transition: letter-spacing 0.8s ease;
        }

        .stage-0 .sg-brand-name { letter-spacing: -0.02em; }
        .stage-1 .sg-brand-name, .stage-2 .sg-brand-name { letter-spacing: -0.04em; }

        .sg-brand-sub {
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.2em;
          color: #888891;
          text-transform: uppercase;
          margin-top: 5px;
        }

        /* --- NAVIGATION --- */
        .sg-nav {
          position: fixed;
          top: 0; left: 0; width: 100%;
          padding: 22px 5%; 
          display: flex;
          justify-content: flex-end; 
          align-items: center;
          z-index: 900;
          transition: background-color 0.4s ease, backdrop-filter 0.4s ease, border 0.4s ease, opacity 0.8s ease;
          background-color: ${scrolled ? 'rgba(255, 255, 255, 0.9)' : 'transparent'};
          backdrop-filter: ${scrolled ? 'blur(20px)' : 'none'};
          -webkit-backdrop-filter: ${scrolled ? 'blur(20px)' : 'none'};
          border-bottom: ${scrolled ? '1px solid rgba(0, 0, 0, 0.05)' : '1px solid transparent'};
          opacity: 0;
          pointer-events: none;
        }

        .sg-nav.stage-2 {
          opacity: 1;
          pointer-events: auto;
          transition-delay: 0.4s;
        }

        .sg-nav-login {
          font-size: 14px;
          font-weight: 500;
          color: #111111;
          text-decoration: none;
          padding: 8px 20px;
          border-radius: 99px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: #fff;
          transition: all 0.2s ease;
        }

        .sg-nav-login:hover {
          background-color: #111111;
          color: #fff;
        }

        /* --- HERO SECTION --- */
        .sg-hero {
          width: 100%;
          max-width: 1200px; 
          margin: 0 auto;
          padding: 12vh 5% 60px; 
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* --- GRAFIK --- */
        .sg-graphic-container {
          width: 100%;
          max-width: 550px;
          margin-bottom: 32px;
          animation: slowFadeIn 1.5s ease forwards, float 7s ease-in-out infinite;
          opacity: 0;
          pointer-events: none;
        }

        .sg-graphic {
          width: 100%;
          height: auto;
          opacity: 0.95;
          user-select: none;
          -webkit-user-drag: none;
        }

        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
          100% { transform: translateY(0px); }
        }

        @keyframes slowFadeIn {
          to { opacity: 1; }
        }

        /* --- CONTENT EINBLENDUNG --- */
        .sg-fade-up {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 1s cubic-bezier(0.16, 1, 0.3, 1), transform 1s cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: none;
        }

        .sg-fade-up.visible {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        .sg-delay-1 { transition-delay: 0.4s; }
        .sg-delay-2 { transition-delay: 0.5s; }
        .sg-delay-3 { transition-delay: 0.6s; }
        .sg-delay-4 { transition-delay: 0.7s; }

        /* --- NEUE TYPOGRAFIE STYLES --- */
        .sg-headline {
          /* Perfekte Skalierung, stoppt bei 72px für optimale Lesbarkeit */
          font-size: clamp(38px, 6vw, 72px); 
          /* Etwas engere Line-Height für große Schriften */
          line-height: 1.05;
          font-weight: 700;
          /* Typisches High-End Tracking */
          letter-spacing: -0.03em;
          margin: 0 0 24px 0;
          max-width: 850px;
          color: #0a0a0b; /* Sehr dunkles Anthrazit, weicher als reines Schwarz */
        }

        .sg-subheadline {
          /* Etwas größer für bessere Balance */
          font-size: clamp(18px, 2vw, 22px);
          /* Großzügige Line-Height für Text */
          line-height: 1.5;
          font-weight: 400;
          /* Satteres, dunkleres Grau */
          color: #55555e;
          max-width: 680px;
          margin: 0 auto 48px auto;
        }

        .sg-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background-color: #0a0a0b;
          color: #ffffff;
          text-decoration: none;
          padding: 18px 42px;
          border-radius: 99px;
          font-size: 17px;
          font-weight: 500;
          letter-spacing: 0; /* Keine Verengung im Button für bessere Lesbarkeit */
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
          margin-bottom: 80px;
        }

        .sg-button:hover {
          background-color: #333336;
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        }

        /* --- FEATURES SECTION --- */
        .sg-features {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 5% 100px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
        }

        .sg-feature-card {
          background-color: #f9f9fb;
          padding: 48px 40px;
          border-radius: 28px;
          border: 1px solid rgba(0,0,0,0.03);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.4s ease;
        }

        .sg-feature-card:hover {
          transform: translateY(-6px);
          background-color: #f1f1f4;
        }

        .sg-feature-icon {
          font-size: 36px;
          margin-bottom: 24px;
        }

        .sg-feature-title {
          font-size: 20px;
          font-weight: 600;
          margin: 0 0 12px 0;
          letter-spacing: -0.01em;
          color: #0a0a0b;
        }

        .sg-feature-desc {
          font-size: 16px; /* Minimal größer */
          line-height: 1.6;
          color: #55555e;
          margin: 0;
        }

        /* --- FOOTER --- */
        .sg-footer {
          width: 100%;
          padding: 60px 5%;
          text-align: center;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
          font-size: 13px;
          color: #888891;
          margin-top: auto;
          background: #ffffff;
        }

        .sg-impressum-btn {
          background: none;
          border: none;
          color: #0a0a0b;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          padding: 8px 16px;
          margin-top: 16px;
          border-radius: 6px;
          transition: background-color 0.2s ease;
        }
        
        .sg-impressum-btn:hover {
          background-color: rgba(0,0,0,0.04);
        }

        .sg-impressum-content {
          margin: 40px auto 0;
          max-width: 800px;
          padding: 40px;
          background: #f9f9fb;
          border-radius: 20px;
          text-align: left;
          line-height: 1.6;
          color: #0a0a0b;
          border: 1px solid rgba(0, 0, 0, 0.06);
          animation: fadeIn 0.4s ease forwards;
        }

        .sg-impressum-content h4 {
          margin: 0 0 20px 0;
          font-size: 18px;
          font-weight: 600;
          letter-spacing: -0.02em;
        }

        .sg-impressum-content a { color: #0071e3; text-decoration: none; }
        .sg-impressum-content a:hover { text-decoration: underline; }

        @media (max-width: 768px) {
          .sg-nav { padding: 16px 5%; }
          .sg-hero { padding-top: 12vh; padding-bottom: 40px; }
          .sg-button { width: 100%; margin-bottom: 60px; }
          .sg-features { padding-bottom: 60px; }
          .sg-impressum-content { padding: 24px; }
          .sg-brand-wrapper.stage-0, .sg-brand-wrapper.stage-1 { 
            transform: translate(-50%, -50%) scale(1.6); 
          }
        }
      `}} />

      <div className="sg-wrapper">
        
        <div className={`sg-brand-wrapper stage-${introStage}`}>
          <div className="sg-brand-inner">
            <span className="sg-welcome-text">Welcome to</span>
            <span className="sg-brand-name">standardgrid</span>
            <span className="sg-brand-sub">by baze technologies</span>
          </div>
        </div>

        <nav className={`sg-nav stage-${introStage}`}>
          <a href="https://app.standard-grid.com" className="sg-nav-login">
            Login
          </a>
        </nav>

        <section className="sg-hero">
          
          <div className="sg-graphic-container">
            <img 
              src="/images/grid_symbol.svg" 
              alt="standardgrid wireframe" 
              className="sg-graphic"
            />
          </div>

          <h1 className={`sg-headline sg-fade-up sg-delay-1 ${introStage === 2 ? 'visible' : ''}`}>
            Dein Tool für visuelle Gebietseinteilungen.
          </h1>
          
          <p className={`sg-subheadline sg-fade-up sg-delay-2 ${introStage === 2 ? 'visible' : ''}`}>
            Visuell. Strukturiert. Geschützt.<br />
            Verwalte deutschlandweite PLZ-Gebiete direkt auf der Karte – flexibel für jeden Use Case.
          </p>

          <div className={`sg-fade-up sg-delay-3 ${introStage === 2 ? 'visible' : ''}`}>
            <a href="https://app.standard-grid.com" className="sg-button">
              App starten <span style={{ marginLeft: '8px', fontSize: '18px' }}>&rarr;</span>
            </a>
          </div>
        </section>

        <section className={`sg-features sg-fade-up sg-delay-4 ${introStage === 2 ? 'visible' : ''}`}>
          <div className="sg-feature-card">
            <div className="sg-feature-icon">🗺️</div>
            <h3 className="sg-feature-title">Kartenbasierte UI</h3>
            <p className="sg-feature-desc">
              Bearbeite und verwalte PLZ-Gebiete intuitiv direkt über die browserbasierte Kartenoberfläche.
            </p>
          </div>

          <div className="sg-feature-card">
            <div className="sg-feature-icon">📂</div>
            <h3 className="sg-feature-title">Strukturierte Zuordnung</h3>
            <p className="sg-feature-desc">
              Organisiere deine Gebiete übersichtlich in Tabs und Gruppen für die perfekte fachliche Trennung.
            </p>
          </div>

          <div className="sg-feature-card">
            <div className="sg-feature-icon">🔒</div>
            <h3 className="sg-feature-title">Sicher & Performant</h3>
            <p className="sg-feature-desc">
              Geschützter Zugang via Cloudflare Zero Trust, kombiniert mit einem extrem schnellen Backend.
            </p>
          </div>
        </section>

        <footer className={`sg-footer sg-fade-up sg-delay-4 ${introStage === 2 ? 'visible' : ''}`}>
          <p style={{ margin: '0 0 8px 0' }}>
            &copy; {new Date().getFullYear()} Standard Grid. Ein Produkt der Baze Technologies GmbH.
          </p>
          
          <button 
            className="sg-impressum-btn"
            onClick={() => setShowImpressum(!showImpressum)}
          >
            {showImpressum ? 'Impressum schließen' : 'Impressum anzeigen'}
          </button>

          {showImpressum && (
            <div className="sg-impressum-content">
              <h4>Impressum</h4>
              <div style={{ fontSize: '14px', display: 'grid', gap: '16px' }}>
                <p style={{ margin: 0 }}>
                  <strong>Angaben gemäß § 5 TMG</strong><br />
                  Baze Technologies GmbH<br />
                  Leverkusenstraße 54<br />
                  22761 Hamburg
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Handelsregister:</strong> HRB 181311<br />
                  <strong>Registergericht:</strong> Amtsgericht Hamburg
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Vertreten durch:</strong><br />
                  Phil Tunder, Bosse Rüschmann
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Kontakt:</strong><br />
                  Telefon: +49 170 9275095<br />
                  E-Mail: info@baze.network
                </p>
                <p style={{ margin: 0 }}>
                  <strong>EU-Streitschlichtung:</strong><br />
                  Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:<br/>
                  <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">
                    https://ec.europa.eu/consumers/odr/
                  </a>
                </p>
              </div>
            </div>
          )}
        </footer>
      </div>
    </>
  );
}