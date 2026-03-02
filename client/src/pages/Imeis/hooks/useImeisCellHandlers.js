import { useCallback } from 'react';

export function useImeisCellHandlers({
  selectedCell,
  setSelectedCell,
  selectedCells,
  setSelectedCells,
  selectionStart,
  setSelectionStart,
  isSelecting,
  setIsSelecting,
  showColorPicker,
  setShowColorPicker,
  cellTextColors,
  setCellTextColors,
  expandSelection,
  persistImeis
}) {
  const handleCellClick = useCallback((item, columnIndex, columnName, event) => {
    const cellId = `${item.sheet || 'default'}-${item.imei}-${item.row}-${columnName || columnIndex}`;
    const rowId = `${item.sheet || 'default'}-${item.imei}-${item.row}`;
    const imeiCellId = `${rowId}-imei`;
    if (columnName === 'imei' || columnName === 'aktion') {
      if (event.shiftKey && selectionStart) {
        const newSelected = expandSelection(selectionStart, cellId);
        if (newSelected.has(imeiCellId) || newSelected.has(`${rowId}-aktion`)) {
          newSelected.add(imeiCellId);
          newSelected.add(`${rowId}-aktion`);
        }
        setSelectedCells(newSelected);
        setShowColorPicker(false);
        setSelectedCell(null);
        return;
      }
      if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
        setSelectionStart(imeiCellId);
        setSelectedCells(new Set([imeiCellId, `${rowId}-aktion`]));
        setShowColorPicker(false);
        setSelectedCell(null);
        return;
      }
    }
    if (event.shiftKey && selectionStart) {
      setSelectedCells(expandSelection(selectionStart, cellId));
      setShowColorPicker(false);
      setSelectedCell(null);
      return;
    }
    if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
      setSelectionStart(cellId);
      setSelectedCells(new Set([cellId]));
      setShowColorPicker(false);
      setSelectedCell(null);
    }
  }, [selectionStart, expandSelection, setSelectedCells, setShowColorPicker, setSelectedCell, setSelectionStart]);

  const handleCellContextMenu = useCallback((item, columnIndex, columnName, event) => {
    event.preventDefault();
    const cellId = `${item.sheet || 'default'}-${item.imei}-${item.row}-${columnName || columnIndex}`;
    setSelectedCell(cellId);
    setShowColorPicker(true);
  }, [setSelectedCell, setShowColorPicker]);

  const handleCellMouseDown = useCallback((item, columnIndex, columnName, event) => {
    if (event.button !== 0) return;
    const cellId = `${item.sheet || 'default'}-${item.imei}-${item.row}-${columnName || columnIndex}`;
    setIsSelecting(true);
    setSelectionStart(cellId);
    setSelectedCells(new Set([cellId]));
    setShowColorPicker(false);
    setSelectedCell(null);
  }, [setIsSelecting, setSelectionStart, setSelectedCells, setShowColorPicker, setSelectedCell]);

  const handleCellMouseEnter = useCallback((item, columnIndex, columnName) => {
    if (!isSelecting || !selectionStart) return;
    const cellId = `${item.sheet || 'default'}-${item.imei}-${item.row}-${columnName || columnIndex}`;
    setSelectedCells(expandSelection(selectionStart, cellId));
  }, [isSelecting, selectionStart, expandSelection, setSelectedCells]);

  const handleCellMouseUp = useCallback(() => setIsSelecting(false), [setIsSelecting]);

  const handleColorSelect = useCallback((color) => {
    if (!selectedCell) return;
    const newColors = { ...cellTextColors, [selectedCell]: color };
    setCellTextColors(newColors);
    persistImeis?.({ cellColors: newColors });
    setShowColorPicker(false);
    setSelectedCell(null);
  }, [selectedCell, cellTextColors, setCellTextColors, setShowColorPicker, setSelectedCell, persistImeis]);

  const getCellTextColor = useCallback((item, columnName) => {
    const cellId = `${item.sheet || 'default'}-${item.imei}-${item.row}-${columnName}`;
    if (cellTextColors[cellId]) return cellTextColors[cellId];
    if (item.rowDataFormats?.[columnName]?.textColor) return item.rowDataFormats[columnName].textColor;
    return '';
  }, [cellTextColors]);

  return {
    handleCellClick,
    handleCellContextMenu,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleCellMouseUp,
    handleColorSelect,
    getCellTextColor
  };
}
