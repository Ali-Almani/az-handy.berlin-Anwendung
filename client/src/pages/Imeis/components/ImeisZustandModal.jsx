const ImeisZustandModal = ({ isOpen, onClose, zustandData, loading }) => {
  if (!isOpen) return null;

  return (
    <div className="imeis-history-modal-overlay" onClick={onClose}>
      <div className="imeis-history-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '95vw', width: '95vw' }}>
        <div className="imeis-history-modal-header">
          <h3>Bestand</h3>
          <button
            onClick={onClose}
            className="imeis-history-modal-close"
            aria-label="Schließen"
          >
            ×
          </button>
        </div>
        <div className="imeis-history-modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '1.2rem', color: '#005d95', marginBottom: '1rem' }}>Lade Daten...</div>
              <div style={{ 
                display: 'inline-block',
                width: '40px',
                height: '40px',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #005d95',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          ) : !zustandData || zustandData.manufacturers.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>
              Keine IMEIs gefunden
            </p>
          ) : (
            <div className="imeis-history-list">
              <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                <h4 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 'bold', color: '#005d95' }}>
                  Verteilung nach Marken
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {zustandData.manufacturers.map((manufacturerData, mIndex) => {
                    const percentage = zustandData.total > 0 ? (manufacturerData.total / zustandData.total * 100).toFixed(1) : 0;
                    const colors = ['#005d95', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1', '#fd7e14', '#20c997', '#e83e8c', '#6c757d'];
                    const color = colors[mIndex % colors.length];
                    return (
                      <div key={mIndex} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ minWidth: '120px', fontSize: '0.9rem', fontWeight: '500', color: '#495057' }}>
                          {manufacturerData.manufacturer}
                        </div>
                        <div style={{ flex: 1, position: 'relative', height: '28px', backgroundColor: '#e9ecef', borderRadius: '4px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              height: '100%', 
                              width: `${percentage}%`, 
                              backgroundColor: color,
                              transition: 'width 0.3s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              paddingRight: '0.5rem',
                              color: '#fff',
                              fontSize: '0.85rem',
                              fontWeight: '500'
                            }}
                          >
                            {percentage > 5 && `${percentage}%`}
                          </div>
                        </div>
                        <div style={{ minWidth: '80px', textAlign: 'right', fontSize: '0.9rem', fontWeight: 'bold', color: '#495057', fontFamily: "'Courier New', monospace" }}>
                          {manufacturerData.total}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #dee2e6', textAlign: 'right' }}>
                  <strong style={{ fontSize: '1rem', color: '#005d95' }}>Gesamt: {zustandData.total} IMEIs</strong>
                </div>
              </div>
              {zustandData.manufacturers.map((manufacturerData, mIndex) => {
                const allCards = manufacturerData.versions.flatMap((versionData) =>
                  versionData.variants.flatMap((variantData) =>
                    variantData.gbs.map((gbData) => {
                      let displayText = versionData.version;
                      if (variantData.variant && variantData.variant !== 'Standard') {
                        displayText += ` ${variantData.variant}`;
                      }
                      if (gbData.gb && gbData.gb !== 'Unbekannt') {
                        displayText += ` ${gbData.gb}`;
                      }
                      return {
                        displayText,
                        count: gbData.count,
                        key: `${mIndex}-${versionData.version}-${variantData.variant}-${gbData.gb}`
                      };
                    })
                  )
                );
                allCards.sort((a, b) => b.count - a.count);
                
                return (
                  <div key={mIndex} style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ 
                      marginBottom: '0.5rem', 
                      padding: '0.5rem', 
                      backgroundColor: '#e9ecef', 
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      color: '#005d95'
                    }}>
                      {manufacturerData.manufacturer} ({manufacturerData.total})
                    </h4>
                    <div style={{ marginLeft: '1rem', display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '0.75rem', width: 'calc(100% - 1rem)' }}>
                      {allCards.map((card) => (
                        <div 
                          key={card.key}
                          style={{
                            padding: '0.5rem',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '4px',
                            border: '1px solid #dee2e6',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            minHeight: '60px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#e9ecef';
                            e.currentTarget.style.borderColor = '#adb5bd';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8f9fa';
                            e.currentTarget.style.borderColor = '#dee2e6';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <div style={{ 
                            whiteSpace: 'normal', 
                            wordBreak: 'break-word', 
                            fontSize: '0.9rem',
                            marginBottom: '0.25rem'
                          }}>
                            {card.displayText}
                          </div>
                          <div style={{ 
                            textAlign: 'right', 
                            fontWeight: 'bold', 
                            fontSize: '0.95rem',
                            color: '#495057',
                            fontFamily: "'Courier New', monospace"
                          }}>
                            {card.count}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="imeis-history-modal-footer">
          <button
            onClick={onClose}
            className="btn btn--secondary btn--small"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImeisZustandModal;
