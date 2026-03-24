import { useState, useRef, useEffect } from 'react';
import TextEditorToolbar from './TextEditorToolbar';
import { useTextEditorFormatting } from './hooks/useTextEditorFormatting';
import './TextEditor.scss';

const TextEditor = ({ initialContent = '', onSave, placeholder = 'Schreiben Sie hier...' }) => {
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

  const { formatText, applyTextColor, applyBackgroundColor } = useTextEditorFormatting(editorRef, setContent);

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
    await onSave?.(content);
    setLastSavedContent(content);
    setIsEditing(false);
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
          />
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
