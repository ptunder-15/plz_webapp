import React from 'react';

function Navigation() {
  const hostname = window.location.hostname;
  const isApp = hostname.includes('app') || hostname === 'localhost' || hostname === '127.0.0.1';

  if (!isApp) return null;

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      padding: '12px 24px',
      background: '#ffffff',
      borderBottom: '1px solid rgba(0,0,0,0.05)',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <img 
          src="/logo-symbol.png" 
          alt="Standard Grid" 
          style={{ height: '32px', width: '32px', marginRight: '12px', objectFit: 'contain' }} 
        />
        <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em', color: '#1d1d1f' }}>
          standardgrid
        </span>
      </div>
    </nav>
  );
}

export default Navigation;