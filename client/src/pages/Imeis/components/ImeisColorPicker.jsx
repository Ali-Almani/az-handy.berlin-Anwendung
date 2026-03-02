const PREDEFINED_COLORS = [
  { name: 'Rot', color: '#F44336' },
  { name: 'Blau', color: '#2196F3' },
  { name: 'Grün', color: '#4CAF50' }
];

const ImeisColorPicker = ({ onColorSelect }) => {
  return (
    <div className="imeis-color-picker" onClick={(e) => e.stopPropagation()}>
      <div className="imeis-color-picker-header">
        Textfarbe wählen
      </div>
      <div className="imeis-color-picker-grid">
        {PREDEFINED_COLORS.map((colorOption, colorIdx) => (
          <div key={colorIdx} className="imeis-color-item">
            <button
              className="imeis-color-option"
              style={{ backgroundColor: colorOption.color }}
              onClick={(e) => {
                e.stopPropagation();
                onColorSelect(colorOption.color);
              }}
              title={colorOption.name}
            />
            <span className="imeis-color-label">{colorOption.name}</span>
          </div>
        ))}
      </div>
      <div className="imeis-color-picker-actions">
        <button
          className="btn btn--secondary btn--small"
          onClick={(e) => {
            e.stopPropagation();
            onColorSelect('');
          }}
        >
          Farbe entfernen
        </button>
      </div>
    </div>
  );
};

export default ImeisColorPicker;
