import { useState, useRef, useEffect, useCallback } from 'react';
import TextEditorToolbar from './TextEditorToolbar';
import { useTextEditorFormatting } from './hooks/useTextEditorFormatting';
import './TextEditor.scss';

function pickAudioMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg'
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return '';
}

function escapeAttrUrl(url) {
  return String(url || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
}

const TextEditor = ({
  initialContent = '',
  onSave,
  placeholder = 'Schreiben Sie hier...',
  /** Optional: { uploadFile: async (file) => urlString } für Bilder in NEWS */
  mediaUpload = null,
  /** Optional: { uploadFile: async (file) => urlString } – Mikrofon aufnehmen (Anweisung) */
  audioUpload = null
}) => {
  const [content, setContent] = useState(initialContent);
  const [lastSavedContent, setLastSavedContent] = useState(initialContent);
  const [isEditing, setIsEditing] = useState(false);
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [currentTextColor, setCurrentTextColor] = useState('#000000');
  const [currentBgColor, setCurrentBgColor] = useState('#ffffff');
  const editorRef = useRef(null);
  const headingMenuRef = useRef(null);
  const colorPickerRef = useRef(null);
  const bgColorPickerRef = useRef(null);
  const imageInputRef = useRef(null);
  const [mediaBusy, setMediaBusy] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioDiscardRef = useRef(false);
  const audioTickRef = useRef(null);
  const [isAudioRecording, setIsAudioRecording] = useState(false);
  const [audioRecordSeconds, setAudioRecordSeconds] = useState(0);
  const [audioBusy, setAudioBusy] = useState(false);

  const { formatText, applyTextColor, applyBackgroundColor } = useTextEditorFormatting(editorRef, setContent);

  const insertMediaFromUrl = (url) => {
    if (!editorRef.current || !url) return;
    editorRef.current.focus();
    requestAnimationFrame(() => {
      try {
        document.execCommand('insertImage', false, url);
        setContent(editorRef.current.innerHTML);
        editorRef.current.focus();
      } catch (err) {
        console.error('Medien einfügen:', err);
      }
    });
  };

  const insertAudioFromUrl = useCallback((url) => {
    if (!editorRef.current || !url) return;
    const safe = escapeAttrUrl(url);
    editorRef.current.focus();
    requestAnimationFrame(() => {
      try {
        const html = `<p><audio controls preload="metadata" src="${safe}"></audio></p>`;
        document.execCommand('insertHTML', false, html);
        setContent(editorRef.current.innerHTML);
        editorRef.current.focus();
      } catch (err) {
        console.error('Audio einfügen:', err);
      }
    });
  }, []);

  const stopAudioStream = useCallback(() => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
  }, []);

  const clearAudioTimer = useCallback(() => {
    if (audioTickRef.current) {
      clearInterval(audioTickRef.current);
      audioTickRef.current = null;
    }
  }, []);

  const startAudioRecording = useCallback(async () => {
    if (!audioUpload?.uploadFile || typeof navigator?.mediaDevices?.getUserMedia !== 'function') {
      alert('Audioaufnahme wird von diesem Browser nicht unterstützt.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioDiscardRef.current = false;
      audioChunksRef.current = [];
      const mimeType = pickAudioMimeType();
      const options = mimeType ? { mimeType } : {};
      const mr = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stopAudioStream();
        clearAudioTimer();
        setIsAudioRecording(false);
        setAudioRecordSeconds(0);
        const discard = audioDiscardRef.current;
        audioDiscardRef.current = false;
        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];
        if (discard || !chunks.length) return;
        const blob = new Blob(chunks, { type: mr.mimeType || mimeType || 'audio/webm' });
        const ext = blob.type.includes('mp4') || blob.type.includes('m4a') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
        const file = new File([blob], `anweisung-${Date.now()}.${ext}`, { type: blob.type || 'audio/webm' });
        try {
          setAudioBusy(true);
          const uploadedUrl = await audioUpload.uploadFile(file);
          if (uploadedUrl) insertAudioFromUrl(uploadedUrl);
        } catch (err) {
          console.error(err);
          alert(err?.response?.data?.message || err?.message || 'Audio-Upload fehlgeschlagen');
        } finally {
          setAudioBusy(false);
        }
      };
      mr.start();
      setIsAudioRecording(true);
      setAudioRecordSeconds(0);
      audioTickRef.current = setInterval(() => {
        setAudioRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.error(err);
      alert('Mikrofon-Zugriff verweigert oder nicht verfügbar.');
    }
  }, [audioUpload, clearAudioTimer, insertAudioFromUrl, stopAudioStream]);

  const finishAudioRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    } else {
      clearAudioTimer();
      stopAudioStream();
      setIsAudioRecording(false);
    }
  }, [clearAudioTimer, stopAudioStream]);

  const cancelAudioRecording = useCallback(() => {
    audioDiscardRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    } else {
      clearAudioTimer();
      stopAudioStream();
      setIsAudioRecording(false);
      setAudioRecordSeconds(0);
    }
  }, [clearAudioTimer, stopAudioStream]);

  useEffect(() => {
    return () => {
      audioDiscardRef.current = true;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch (_) {}
      }
      clearAudioTimer();
      stopAudioStream();
    };
  }, [clearAudioTimer, stopAudioStream]);

  const handleMediaFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !mediaUpload?.uploadFile) return;
    try {
      setMediaBusy(true);
      const url = await mediaUpload.uploadFile(file);
      if (url) insertMediaFromUrl(url);
    } catch (err) {
      console.error('Upload:', err);
      alert(err?.response?.data?.message || err?.message || 'Upload fehlgeschlagen');
    } finally {
      setMediaBusy(false);
    }
  };

  useEffect(() => {
    setContent(initialContent);
    setLastSavedContent(initialContent);
  }, [initialContent]);

  useEffect(() => {
    if (isEditing && editorRef.current) {
      editorRef.current.focus();
      if (content) {
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }, [isEditing, content]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (headingMenuRef.current && !headingMenuRef.current.contains(event.target)) setShowHeadingMenu(false);
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) setShowColorPicker(false);
      if (bgColorPickerRef.current && !bgColorPickerRef.current.contains(event.target)) setShowBgColorPicker(false);
    };
    if (showHeadingMenu || showColorPicker || showBgColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showHeadingMenu, showColorPicker, showBgColorPicker]);

  const handleInput = (e) => setContent(e.target.innerHTML);

  const handleSave = async () => {
    // Zuletzt im DOM stehen lassen: Bei contentEditable fehlt manchmal das letzte onInput vor Klick auf Speichern.
    const payload =
      isEditing && editorRef.current ? editorRef.current.innerHTML : content;
    await onSave?.(payload);
    setContent('');
    setLastSavedContent('');
    setIsEditing(false);
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
  };

  const handleCancel = () => {
    setContent(lastSavedContent);
    setIsEditing(false);
  };

  const insertHeading = (level) => {
    // formatBlock erwartet Tag-Namen (z. B. h1), keine spitzen Klammern
    const tag = level === 0 ? 'p' : `h${level}`;
    formatText('formatBlock', tag);
    setShowHeadingMenu(false);
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
      if (e.key === 'b') { e.preventDefault(); formatText('bold'); }
      else if (e.key === 'i') { e.preventDefault(); formatText('italic'); }
      else if (e.key === 'u') { e.preventDefault(); formatText('underline'); }
    }
    // Wie Microsoft Word: Strg+Alt+1 … Strg+Alt+6 = Überschrift 1–6, Strg+Alt+0 = Absatz
    if ((e.ctrlKey || e.metaKey) && e.altKey && !e.shiftKey) {
      if (e.key === '0' || e.code === 'Digit0' || e.code === 'Numpad0') {
        e.preventDefault();
        formatText('formatBlock', 'p');
        return;
      }
      const codeMatch = /^(?:Digit|Numpad)([1-6])$/.exec(e.code);
      if (codeMatch) {
        e.preventDefault();
        formatText('formatBlock', `h${codeMatch[1]}`);
        return;
      }
      if (/^[1-6]$/.test(e.key)) {
        e.preventDefault();
        formatText('formatBlock', `h${e.key}`);
      }
    }
    if (e.key === 'Escape' && isEditing) handleCancel();
  };

  return (
    <div className="text-editor">
      {isEditing ? (
        <>
          <TextEditorToolbar
            editorRef={editorRef}
            formatText={formatText}
            insertHeading={insertHeading}
            applyTextColor={applyTextColor}
            applyBackgroundColor={applyBackgroundColor}
            showHeadingMenu={showHeadingMenu}
            setShowHeadingMenu={setShowHeadingMenu}
            showColorPicker={showColorPicker}
            setShowColorPicker={setShowColorPicker}
            showBgColorPicker={showBgColorPicker}
            setShowBgColorPicker={setShowBgColorPicker}
            currentTextColor={currentTextColor}
            setCurrentTextColor={setCurrentTextColor}
            currentBgColor={currentBgColor}
            setCurrentBgColor={setCurrentBgColor}
            headingMenuRef={headingMenuRef}
            colorPickerRef={colorPickerRef}
            bgColorPickerRef={bgColorPickerRef}
            imageInputRef={imageInputRef}
            onMediaFileChange={handleMediaFile}
            mediaBusy={mediaBusy}
            showMediaUpload={!!mediaUpload?.uploadFile}
          />
          {audioUpload?.uploadFile && (
            <div className="text-editor-audio-row">
              {!isAudioRecording ? (
                <button
                  type="button"
                  className="btn btn--outline btn--small"
                  disabled={audioBusy || mediaBusy}
                  onClick={startAudioRecording}
                >
                  Audio aufnehmen
                </button>
              ) : (
                <>
                  <span className="text-editor-recording-indicator">
                    <span className="text-editor-rec-dot" aria-hidden />
                    Aufnahme… {audioRecordSeconds}s
                  </span>
                  <button type="button" className="btn btn--primary btn--small" onClick={finishAudioRecording}>
                    Beenden & einfügen
                  </button>
                  <button type="button" className="btn btn--outline btn--small" onClick={cancelAudioRecording}>
                    Abbrechen
                  </button>
                </>
              )}
              {audioBusy && <span className="text-editor-media-busy">Audio wird hochgeladen…</span>}
            </div>
          )}
          <div
            ref={editorRef}
            contentEditable
            className="text-editor-content"
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            dangerouslySetInnerHTML={{ __html: content }}
            data-placeholder={placeholder}
            suppressContentEditableWarning={true}
          />
          <div className="text-editor-actions">
            <button onClick={handleSave} className="btn btn--primary btn--small">Speichern</button>
            <button onClick={handleCancel} className="btn btn--outline btn--small">Abbrechen</button>
          </div>
        </>
      ) : (
        <>
          <div
            className="text-editor-display"
            onClick={() => setIsEditing(true)}
            dangerouslySetInnerHTML={{ __html: content || `<p style="color: #999; font-style: italic;">${placeholder}</p>` }}
          />
          <button onClick={() => setIsEditing(true)} className="btn btn--outline btn--small" style={{ marginTop: '20px', marginBottom: '20px', marginLeft: '20px' }}>
            Bearbeiten
          </button>
        </>
      )}
    </div>
  );
};

export default TextEditor;
