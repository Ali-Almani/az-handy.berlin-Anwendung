import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { readExcelFile } from '../../utils/excelParser';
import { getManufacturer } from '../../utils/manufacturer';
import { uploadExcelFile } from '../../services/api.js';
import { saveImeis } from '../../utils/storage';
import { persistImeisState } from '../../services/imeis.service';

const VALID_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

const ExcelUpload = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadedImeis, setUploadedImeis] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (VALID_EXTENSIONS.includes(ext)) {
      setSelectedFile(file);
      setUploadStatus(null);
    } else {
      setUploadStatus({ type: 'error', message: 'Bitte wählen Sie eine Excel-Datei (.xlsx, .xls oder .csv)' });
      setSelectedFile(null);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setUploadStatus({ type: 'error', message: 'Bitte wählen Sie zuerst eine Datei aus' });
      return;
    }

    setIsProcessing(true);
    setUploadedImeis([]);

    try {
      const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true' ||
        import.meta.env.VITE_API_URL === 'mock' ||
        !import.meta.env.VITE_API_URL;

      let imeis = [];

      if (USE_MOCK_API) {
        setUploadStatus({ type: 'info', message: 'Datei wird lokal verarbeitet...' });
        imeis = await readExcelFile(selectedFile);
      } else {
        setUploadStatus({ type: 'info', message: 'Datei wird hochgeladen und verarbeitet...' });
        const response = await uploadExcelFile(selectedFile);
        if (!response.success || !response.data?.length) {
          setUploadStatus({ type: 'error', message: response.message || 'Keine IMEI-Daten in der Datei gefunden' });
          setIsProcessing(false);
          return;
        }
        imeis = response.data;
      }

      if (imeis.length === 0) {
        setUploadStatus({ type: 'error', message: 'Keine IMEI-Daten in der Datei gefunden' });
        setIsProcessing(false);
        return;
      }

      setUploadedImeis(imeis);
      setUploadStatus({ type: 'success', message: `${imeis.length} IMEI(s) wurden erfolgreich gelesen. Alte Daten wurden ersetzt.` });
      await saveImeis(imeis);
      await persistImeisState(user, { imeis });

      setSelectedFile(null);
      const fileInput = document.getElementById('excel-file-input');
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Error processing file:', error);
      setUploadStatus({ type: 'error', message: 'Fehler beim Verarbeiten der Datei: ' + (error.response?.data?.message || error.message) });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewAllImeis = () => navigate('/imeis');

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Excel/CSV-Datei hochladen</h2>
      </div>
      <div className="card-body">
        <div className="excel-upload-section">
          <div className="form-group">
            <label htmlFor="excel-file-input" className="form-label">
              Excel/CSV-Datei auswählen (.xlsx, .xls, .csv)
            </label>
            <div className="file-input-wrapper">
              <input
                id="excel-file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="file-input"
              />
              <label htmlFor="excel-file-input" className="file-input-label">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 2L12.5 5H15C15.5523 5 16 5.44772 16 6V15C16 15.5523 15.5523 16 15 16H5C4.44772 16 4 15.5523 4 15V5C4 4.44772 4.44772 4 5 4H7.5L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 7V13M7 10H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Datei auswählen</span>
              </label>
            </div>
            {selectedFile && (
              <div className="file-info">
                <p>Ausgewählte Datei: <strong>{selectedFile.name}</strong></p>
                <p>Größe: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            )}
          </div>

          {uploadStatus && (
            <div className={`upload-status upload-status--${uploadStatus.type}`}>
              {uploadStatus.message}
            </div>
          )}

          <button
            onClick={handleFileUpload}
            className="btn btn--primary"
            disabled={!selectedFile || isProcessing}
          >
            {isProcessing ? 'Wird verarbeitet...' : 'Datei hochladen'}
          </button>

          {uploadedImeis.length > 0 && (
            <div className="uploaded-imeis-preview">
              <div className="uploaded-imeis-header">
                <h3>Gelesene IMEI-Daten ({uploadedImeis.length})</h3>
                <button onClick={handleViewAllImeis} className="btn btn--secondary btn--small">
                  Alle IMEIs anzeigen
                </button>
              </div>
              <div className="uploaded-imeis-table-wrapper">
                <table className="uploaded-imeis-table">
                  <thead>
                    <tr>
                      <th>IMEI</th>
                      <th>Hersteller</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadedImeis.slice(0, 10).map((item, index) => (
                      <tr key={`${item.imei}-${item.row}-${index}`}>
                        <td className="imei-value">{item.imei}</td>
                        <td>{getManufacturer(item) || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {uploadedImeis.length > 10 && (
                  <p className="uploaded-imeis-more">
                    ... und {uploadedImeis.length - 10} weitere.
                    <button onClick={handleViewAllImeis} className="link-button">Alle anzeigen</button>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExcelUpload;
