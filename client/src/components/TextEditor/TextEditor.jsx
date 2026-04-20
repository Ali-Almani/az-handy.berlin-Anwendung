import { useState, useRef, useEffect } from 'react';
import TextEditorToolbar from './TextEditorToolbar';
import { useTextEditorFormatting } from './hooks/useTextEditorFormatting';
import './TextEditor.scss';

const TextEditor = ({
  initialContent = '',
  onSave,
  placeholder = 'Schreiben Sie hier...',
  /** Optional: { uploadFile: async (file) => urlString } für Bilder in NEWS */
  mediaUpload = null
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
    if (!isEditing) return;
    if (!editorRef.current) return;
    // Beim Eintritt in den Edit-Modus initialisieren; danach DOM nicht dauernd überschreiben,
    // sonst springt der Cursor beim Tippen ans Ende.
    editorRef.current.innerHTML = content || '';
    editorRef.current.focus();
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }, [isEditing]);

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
    if (editorRef.current) {
      editorRef.current.innerHTML = lastSavedContent || '';
    }
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
          <div
            ref={editorRef}
            contentEditable
            className="text-editor-content"
            onInput={handleInput}
            onKeyDown={handleKeyDown}
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
