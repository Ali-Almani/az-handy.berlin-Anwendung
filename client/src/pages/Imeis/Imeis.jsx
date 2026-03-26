import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { canAccessImeisList, canUseImeiAdvancedActions, canSeeBestand, isBüroMitarbeiter, isTeamleiterShop, isAdmin } from '../../utils/roles';
import { useImeis } from './hooks/useImeis';
import ImeisFilters from './components/ImeisFilters';
import ImeisControls from './components/ImeisControls';
import ImeisTable from './components/ImeisTable';
import ImeisStats from './components/ImeisStats';
import ImeisPagination from './components/ImeisPagination';
import ImeisEmpty from './components/ImeisEmpty';
import ImeisHistoryModal from './components/ImeisHistoryModal';
import { sendImeiReminderApi, getMyImeiRemindersApi, markImeiReminderReadApi, createExtraCopyRequestApi } from '../../services/imeis.service';
import ImeisZustandModal from './components/ImeisZustandModal';
import ImeisRateLimitModal from './components/ImeisRateLimitModal';
import './Imeis.scss';

const Imeis = () => {
  const {
    user,
    loading,
    searchTerm,
    setSearchTerm,
    filteredImeis,
    currentImeis,
    startIndex,
    endIndex,
    totalPages,
    itemsPerPage,
    setItemsPerPage,
    currentPage,
    setCurrentPage,
    availableManufacturers,
    activeManufacturer,
    setActiveManufacturer,
    availableVersions,
    activeVersion,
    setActiveVersion,
    availableVariants,
    activeVariant,
    setActiveVariant,
    availableGBs,
    activeGB,
    setActiveGB,
    availableProducts,
    activeProduct,
    setActiveProduct,
    history,
    handleUndo,
    handleExport,
    handleDeleteAll,
    handleUpdateHistoryAction,
    handleHistoryModalUndo,
    copyHistory,
    showHistoryModal,
    setShowHistoryModal,
    historyUndoStack,
    showZustandModal,
    setShowZustandModal,
    zustandDataCache,
    zustandLoading,
    showRateLimitModal,
    setShowRateLimitModal,
    rateLimitMessage,
    imeis,
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
    handleCellClick,
    handleCellContextMenu,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleCellMouseUp,
    handleColorSelect,
    handleDropdownSelect,
    availableSheets,
    activeSheet,
    setActiveSheet,
    onManufacturerChange,
    onVersionChange,
    onVariantChange,
    onGBChange,
    onShowZustand,
    onCloseZustandModal,
    onRowActionRemove
  } = useImeis();

  const [searchParams, setSearchParams] = useSearchParams();
  const [reminderImeiFilter, setReminderImeiFilter] = useState(null);

  useEffect(() => {
    if (searchParams.get('showVerlauf') === '1') {
      searchParams.delete('showVerlauf');
      setSearchParams(searchParams, { replace: true });
      getMyImeiRemindersApi().then((res) => {
        const reminders = res?.reminders ?? [];
        const imeis = [...new Set(reminders.map((r) => String(r.imei || '').trim()).filter(Boolean))];
        setReminderImeiFilter(imeis.length > 0 ? imeis : null);
        setShowHistoryModal(true);
        reminders.forEach((r) => markImeiReminderReadApi(r.id));
      });
    }
  }, [searchParams, setSearchParams, setShowHistoryModal]);

  if (!canAccessImeisList(user)) {
    return (
      <div className="imeis">
        <div className="card">
          <div className="card-body">
            <p>
              Die IMEI-Übersicht ist für den Einsatzort Zentrale nicht vorgesehen.
              Zugang haben weiterhin nur Administratoren und Büro-Mitarbeitende.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="imeis">
        <div className="card">
          <div className="card-body">
            <p>Lädt...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="imeis">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">IMEI-Verwaltung</h2>
        </div>
        <div className="card-body">
          <ImeisControls
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            history={history}
            onUndo={handleUndo}
            onExport={handleExport}
            filteredImeisLength={filteredImeis.length}
            copyHistoryLength={copyHistory.length}
            onShowHistory={() => { setReminderImeiFilter(null); setShowHistoryModal(true); }}
            imeisLength={imeis.length}
            onDeleteAll={handleDeleteAll}
            onShowZustand={onShowZustand}
            showAdvancedActions={canUseImeiAdvancedActions(user)}
            showBestand={canSeeBestand(user)}
          />

          {false && availableSheets.length > 0 && (
            <div className="imeis-sheet-tabs" style={{ display: 'none' }}>
              {availableSheets.map((sheet) => (
                <button
                  key={sheet}
                  onClick={() => setActiveSheet(sheet)}
                  className={`imeis-sheet-tab ${activeSheet === sheet ? 'imeis-sheet-tab--active' : ''}`}
                >
                  {sheet}
                </button>
              ))}
            </div>
          )}

          <ImeisFilters
            availableManufacturers={availableManufacturers}
            activeManufacturer={activeManufacturer}
            onManufacturerChange={onManufacturerChange}
            availableVersions={availableVersions}
            activeVersion={activeVersion}
            onVersionChange={onVersionChange}
            availableVariants={availableVariants}
            activeVariant={activeVariant}
            onVariantChange={onVariantChange}
            availableGBs={availableGBs}
            activeGB={activeGB}
            onGBChange={onGBChange}
            availableProducts={availableProducts}
            activeProduct={activeProduct}
            onProductChange={setActiveProduct}
          />

          <ImeisStats
            activeManufacturer={activeManufacturer}
            activeVersion={activeVersion}
            activeVariant={activeVariant}
            activeProduct={activeProduct}
            activeGB={activeGB}
            filteredImeisLength={filteredImeis.length}
            searchTerm={searchTerm}
            startIndex={startIndex}
            endIndex={endIndex}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={setItemsPerPage}
            onPageReset={() => setCurrentPage(1)}
          />

          {filteredImeis.length === 0 ? (
            <ImeisEmpty searchTerm={searchTerm} />
          ) : (
            <>
              <ImeisTable
                currentImeis={currentImeis}
                startIndex={startIndex}
                allColumns={allColumns}
                selectedCells={selectedCells}
                selectedCell={selectedCell}
                showColorPicker={showColorPicker}
                rowActions={rowActions}
                cellTextColors={cellTextColors}
                maskImei={maskImei}
                getManufacturer={getManufacturer}
                getProductFull={getProductFull}
                getCellTextColor={getCellTextColor}
                onCellClick={handleCellClick}
                onCellContextMenu={handleCellContextMenu}
                onCellMouseDown={handleCellMouseDown}
                onCellMouseEnter={handleCellMouseEnter}
                onCellMouseUp={handleCellMouseUp}
                onColorSelect={handleColorSelect}
                onDropdownSelect={handleDropdownSelect}
                onRowActionRemove={onRowActionRemove}
              />
              <ImeisPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
      </div>

      <ImeisHistoryModal
        isOpen={showHistoryModal}
        onClose={() => { setShowHistoryModal(false); setReminderImeiFilter(null); }}
        copyHistory={copyHistory}
        filterImeis={reminderImeiFilter}
        onUpdateHistoryAction={handleUpdateHistoryAction}
        historyUndoStack={historyUndoStack}
        onUndo={handleHistoryModalUndo}
        canSendReminder={isBüroMitarbeiter(user) || isTeamleiterShop(user)}
        currentUserName={user?.name}
        onSendReminder={async (entry) => {
          await sendImeiReminderApi(entry.userName, entry.imei);
        }}
      />

      <ImeisZustandModal
        isOpen={showZustandModal}
        onClose={onCloseZustandModal}
        zustandData={zustandDataCache || { manufacturers: [], total: 0 }}
        loading={zustandLoading}
        isAdmin={isAdmin(user)}
      />

      <ImeisRateLimitModal
        isOpen={showRateLimitModal}
        onClose={() => setShowRateLimitModal(false)}
        message={rateLimitMessage}
        canRequestExtra={user && !isBüroMitarbeiter(user) && !isAdmin(user)}
        onRequestExtra={createExtraCopyRequestApi}
      />
    </div>
  );
};

export default Imeis;
