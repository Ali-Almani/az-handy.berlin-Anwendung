import { getManufacturerColumnKey } from '../utils/ImeisUtils';
import ImeisColorPicker from './ImeisColorPicker';

const ImeisTable = ({
  currentImeis,
  startIndex,
  allColumns,
  selectedCells,
  selectedCell,
  showColorPicker,
  rowActions,
  cellTextColors,
  maskImei,
  getManufacturer,
  getProductFull,
  getCellTextColor,
  onCellClick,
  onCellContextMenu,
  onCellMouseDown,
  onCellMouseEnter,
  onCellMouseUp,
  onColorSelect,
  onDropdownSelect,
  onRowActionRemove
}) => {
  return (
    <div className="imeis-table-wrapper">
      <table className="imeis-table">
        <thead>
          <tr>
            <th style={{ width: '25%' }}>IMEI</th>
            <th style={{ width: '20%' }}>Aktion</th>
            <th style={{ width: '20%' }}>Hersteller</th>
            <th style={{ width: '35%' }}>Produkt</th>
          </tr>
        </thead>
        <tbody>
          {currentImeis.map((item, index) => {
            const globalIndex = startIndex + index;
            const rowId = `${item.sheet || 'default'}-${item.imei}-${item.row}`;
            const imeiCellId = `${rowId}-imei`;
            const manufacturer = getManufacturer(item);
            const manufacturerKey = getManufacturerColumnKey(item);
            const manufacturerCellId = manufacturerKey ? `${rowId}-${manufacturerKey}` : null;
            const aktionCellId = `${rowId}-aktion`;
            const isImeiSelected = selectedCells.has(imeiCellId);
            const isAktionSelected = selectedCells.has(aktionCellId);
            const isRowSelected = isImeiSelected || isAktionSelected;

            return (
              <tr
                key={`${item.sheet || 'sheet'}-${item.imei}-${item.row}-${globalIndex}`}
                className={isRowSelected ? 'imeis-row-selected' : ''}
              >
                <td
                  className={`imeis-cell ${selectedCells.has(imeiCellId) ? 'imeis-cell-selected' : ''}`}
                  onClick={(e) => onCellClick(item, -1, 'imei', e)}
                  onContextMenu={(e) => onCellContextMenu(item, -1, 'imei', e)}
                  onMouseDown={(e) => onCellMouseDown(item, -1, 'imei', e)}
                  onMouseEnter={(e) => onCellMouseEnter(item, -1, 'imei', e)}
                  onMouseUp={onCellMouseUp}
                  style={{
                    color: getCellTextColor(item, 'imei') || 'inherit',
                    cursor: 'pointer',
                    position: 'relative',
                    userSelect: 'none',
                    width: '25%'
                  }}
                >
                  {maskImei(item.imei)}
                  {selectedCell === imeiCellId && showColorPicker && (
                    <ImeisColorPicker onColorSelect={onColorSelect} />
                  )}
                </td>
                {isImeiSelected ? (
                  <td
                    className={`imeis-row-dropdown-cell imeis-cell ${selectedCells.has(aktionCellId) ? 'imeis-cell-selected' : ''}`}
                    style={{ position: 'relative', padding: '0.5rem', width: '20%', cursor: 'pointer' }}
                    onClick={(e) => onCellClick(item, -1, 'aktion', e)}
                    onMouseDown={(e) => onCellMouseDown(item, -1, 'aktion', e)}
                    onMouseEnter={(e) => onCellMouseEnter(item, -1, 'aktion', e)}
                    onMouseUp={onCellMouseUp}
                  >
                    <div className="imeis-row-dropdown-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="checkbox"
                        id={`reservieren-checkbox-${rowId}`}
                        checked={rowActions[rowId]?.action === 'reservieren' || false}
                        onChange={async (e) => {
                          e.stopPropagation();
                          const isChecked = e.target.checked;
                          if (isChecked) {
                            await onDropdownSelect(item, 'reservieren');
                          } else {
                            onRowActionRemove(rowId);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                      />
                      <label
                        htmlFor={`reservieren-checkbox-${rowId}`}
                        style={{ cursor: 'pointer', fontSize: '0.9rem', margin: 0, userSelect: 'none' }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        Reservieren
                      </label>
                      {rowActions[rowId] && (
                        <div style={{ fontSize: '0.75rem', color: '#666', marginLeft: '0.5rem' }}>
                          ({rowActions[rowId].userName})
                        </div>
                      )}
                    </div>
                  </td>
                ) : (
                  <td style={{ padding: '0.5rem', width: '20%' }}>
                    {rowActions[rowId] ? (
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>
                        <strong>
                          {rowActions[rowId].action === 'reservieren' ? 'Reservieren' :
                           rowActions[rowId].action === 'checkout' ? 'Check out' :
                           rowActions[rowId].action === 'dereserviert' ? 'Dereserviert' :
                           rowActions[rowId].action}
                        </strong> - {rowActions[rowId].userName}
                      </div>
                    ) : (
                      <span style={{ color: '#999' }}>-</span>
                    )}
                  </td>
                )}
                <td
                  className={`imeis-cell ${manufacturerCellId && selectedCells.has(manufacturerCellId) ? 'imeis-cell-selected' : ''}`}
                  onClick={(e) => manufacturerKey && onCellClick(item, allColumns.indexOf(manufacturerKey), manufacturerKey, e)}
                  onContextMenu={(e) => manufacturerKey && onCellContextMenu(item, allColumns.indexOf(manufacturerKey), manufacturerKey, e)}
                  onMouseDown={(e) => manufacturerKey && onCellMouseDown(item, allColumns.indexOf(manufacturerKey), manufacturerKey, e)}
                  onMouseEnter={(e) => manufacturerKey && onCellMouseEnter(item, allColumns.indexOf(manufacturerKey), manufacturerKey, e)}
                  onMouseUp={onCellMouseUp}
                  style={{
                    color: manufacturerKey ? (getCellTextColor(item, manufacturerKey) || 'inherit') : 'inherit',
                    cursor: manufacturerKey ? 'pointer' : 'default',
                    position: 'relative',
                    userSelect: 'none',
                    width: '20%'
                  }}
                >
                  {manufacturer || '-'}
                  {manufacturerKey && selectedCell === manufacturerCellId && showColorPicker && (
                    <ImeisColorPicker onColorSelect={onColorSelect} />
                  )}
                </td>
                <td
                  style={{
                    padding: '0.5rem',
                    width: '35%',
                    fontSize: '0.85rem',
                    wordBreak: 'break-word'
                  }}
                >
                  {(() => {
                    const productFull = getProductFull(item);
                    if (productFull) {
                      return <span>{productFull}</span>;
                    }
                    if (item.rowData) {
                      const productValues = [];
                      Object.entries(item.rowData).forEach(([key, value]) => {
                        if (!key) return;
                        const lowerKey = String(key).toLowerCase().trim();
                        if (lowerKey.includes('imei')) return;
                        if (manufacturerKey && key === manufacturerKey) return;
                        if (lowerKey === 'produkt' || lowerKey === 'product' ||
                            lowerKey.includes('produkt') || lowerKey.includes('product')) return;
                        if (value !== undefined && value !== null && String(value).trim()) {
                          productValues.push(String(value).trim());
                        }
                      });
                      return productValues.length > 0 ? (
                        <span>{productValues.join(' ')}</span>
                      ) : (
                        <span style={{ color: '#999' }}>-</span>
                      );
                    }
                    return <span style={{ color: '#999' }}>-</span>;
                  })()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ImeisTable;
