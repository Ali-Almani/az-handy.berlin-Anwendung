import { useState } from 'react';
import { uploadVoucherExcelFile } from '../../services/api.js';

const VALID_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

const VoucherExcelUpload = ({ embedded = false }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadedRows, setUploadedRows] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (VALID_EXTENSIONS.includes(ext)) {
      setSelectedFile(file);
      setUploadStatus(null);
    } else {
      setUploadStatus({
        type: 'error',
        message: 'Bitte wählen Sie eine Excel-Datei (.xlsx, .xls oder .csv)'
      });
      setSelectedFile(null);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setUploadStatus({ type: 'error', message: 'Bitte wählen Sie zuerst eine Datei aus' });
      return;
    }
    setIsProcessing(true);
    setUploadedRows([]);
    try {
      setUploadStatus({ type: 'info', message: 'Datei wird hochgeladen und verarbeitet...' });
      const response = await uploadVoucherExcelFile(selectedFile);
      if (!response.success || !Array.isArray(response.data) || response.data.length === 0) {
        setUploadStatus({
          type: 'error',
          message: response.message || 'Keine Voucher-Daten in der Datei gefunden'
        });
        setIsProcessing(false);
        return;
      }
      setUploadedRows(response.data);
      setUploadStatus({
        type: 'success',
        message: response.message || `${response.data.length} Zeile(n) gespeichert.`
      });
      setSelectedFile(null);
      const input = document.getElementById('voucher-file-input');
      if (input) input.value = '';
    } catch (error) {
      console.error('Voucher-Upload:', error);
      setUploadStatus({
        type: 'error',
        message:
          error.response?.data?.message ||
          error.message ||
          'Fehler beim Verarbeiten der Datei'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const previewColumns = uploadedRows[0]?.columnOrder?.length
    ? uploadedRows[0].columnOrder
    : Object.keys(uploadedRows[0]?.rowData || {});

  const body = (
    <div className="excel-upload-section">
      <div className="form-group">
        <label htmlFor="voucher-file-input" className="form-label">
          Voucher Excel-Datei auswählen (.xlsx, .xls, .csv)
        </label>
        <div className="file-input-wrapper">
          <input
            id="voucher-file-input"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="file-input"
          />
          <label htmlFor="voucher-file-input" className="file-input-label">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M10 2L12.5 5H15C15.5523 5 16 5.44772 16 6V15C16 15.5523 15.5523 16 15 16H5C4.44772 16 4 15.5523 4 15V5C4 4.44772 4.44772 4 5 4H7.5L10 2Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M10 7V13M7 10H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Datei auswählen</span>
          </label>
        </div>
        {selectedFile && (
          <div className="file-info">
            <p>
              Ausgewählte Datei: <strong>{selectedFile.name}</strong>
            </p>
            <p>Größe: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        )}
      </div>

      {uploadStatus && (
        <div className={`upload-status upload-status--${uploadStatus.type}`}>{uploadStatus.message}</div>
      )}

      <button
        type="button"
        onClick={handleFileUpload}
        className="btn btn--primary"
        disabled={!selectedFile || isProcessing}
      >
        {isProcessing ? 'Wird verarbeitet...' : 'Datei hochladen'}
      </button>

      {uploadedRows.length > 0 && previewColumns.length > 0 && (
        <div className="uploaded-imeis-preview">
          <div className="uploaded-imeis-header">
            <h3>Gespeicherte Voucher-Zeilen ({uploadedRows.length})</h3>
          </div>
          <div className="uploaded-imeis-table-wrapper">
            <table className="uploaded-imeis-table">
              <thead>
                <tr>
                  {previewColumns.slice(0, 6).map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uploadedRows.slice(0, 10).map((item, index) => (
                  <tr key={`${item.row}-${item.sheet}-${index}`}>
                    {previewColumns.slice(0, 6).map((col) => (
                      <td key={col}>{item.rowData?.[col] ?? '–'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {uploadedRows.length > 10 && (
              <p className="uploaded-imeis-more">… und {uploadedRows.length - 10} weitere Zeilen gespeichert.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return body;
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Voucher Excel-Datei hochladen</h2>
      </div>
      <div className="card-body">{body}</div>
    </div>
  );
};

export default VoucherExcelUpload;
