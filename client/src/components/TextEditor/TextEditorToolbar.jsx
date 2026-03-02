import React from 'react';

const TEXT_COLOR_PRESETS = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF'];
const BG_COLOR_PRESETS = ['#FFFFFF', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000', '#000000'];

const ToolbarButton = ({ onClick, title, onMouseDown, children }) => (
  <button
    type="button"
    onClick={onClick}
    className="toolbar-btn"
    title={title}
    onMouseDown={(e) => {
      e.preventDefault();
      onMouseDown?.(e);
    }}
  >
    {children}
  </button>
);

const TextEditorToolbar = ({
  editorRef,
  formatText,
  insertHeading,
  applyTextColor,
  applyBackgroundColor,
  showHeadingMenu,
  setShowHeadingMenu,
  showColorPicker,
  setShowColorPicker,
  showBgColorPicker,
  setShowBgColorPicker,
  currentTextColor,
  setCurrentTextColor,
  currentBgColor,
  setCurrentBgColor,
  headingMenuRef,
  colorPickerRef,
  bgColorPickerRef
}) => {
  const preventAndFocus = (e) => {
    e.preventDefault();
    e.stopPropagation();
    editorRef.current?.focus();
  };

  return (
    <div className="text-editor-toolbar">
      <ToolbarButton onClick={() => formatText('bold')} title="Fett (Ctrl+B)" onMouseDown={preventAndFocus}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><text x="4" y="12" fontSize="12" fontWeight="700" fill="currentColor" fontFamily="'Segoe UI', Arial, sans-serif">B</text></svg>
      </ToolbarButton>
      <ToolbarButton onClick={() => formatText('italic')} title="Kursiv (Ctrl+I)" onMouseDown={preventAndFocus}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><text x="5" y="12" fontSize="12" fontStyle="italic" fill="currentColor" fontFamily="'Segoe UI', Arial, sans-serif">I</text></svg>
      </ToolbarButton>
      <ToolbarButton onClick={() => formatText('underline')} title="Unterstrichen (Ctrl+U)" onMouseDown={preventAndFocus}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><text x="4" y="12" fontSize="12" fill="currentColor" fontFamily="'Segoe UI', Arial, sans-serif">U</text><path d="M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </ToolbarButton>
      <div className="toolbar-divider" />

      <div className="toolbar-dropdown" ref={headingMenuRef}>
        <ToolbarButton onClick={() => setShowHeadingMenu(!showHeadingMenu)} title="Überschrift" onMouseDown={(e) => e.preventDefault()}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><text x="4" y="11" fontSize="11" fontWeight="700" fill="currentColor" fontFamily="'Segoe UI', Arial, sans-serif">H</text><path d="M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </ToolbarButton>
        {showHeadingMenu && (
          <div className="toolbar-dropdown-menu">
            {[1, 2, 3, 4, 5, 6].map(level => (
              <button key={level} type="button" onClick={() => insertHeading(level)} className="toolbar-dropdown-item">
                Überschrift {level}
              </button>
            ))}
          </div>
        )}
      </div>

      <ToolbarButton onClick={(e) => { preventAndFocus(e); formatText('insertUnorderedList'); }} title="Aufzählung">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="2.5" cy="4" r="0.8" fill="currentColor"/><circle cx="2.5" cy="8" r="0.8" fill="currentColor"/><circle cx="2.5" cy="12" r="0.8" fill="currentColor"/><path d="M5 4h9M5 8h9M5 12h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
      </ToolbarButton>
      <ToolbarButton onClick={(e) => { preventAndFocus(e); formatText('insertOrderedList'); }} title="Nummerierte Liste">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><text x="1.5" y="5.5" fontSize="7" fontWeight="600" fill="currentColor" fontFamily="'Segoe UI', Arial, sans-serif">1</text><text x="1.5" y="9.5" fontSize="7" fontWeight="600" fill="currentColor" fontFamily="'Segoe UI', Arial, sans-serif">2</text><text x="1.5" y="13.5" fontSize="7" fontWeight="600" fill="currentColor" fontFamily="'Segoe UI', Arial, sans-serif">3</text><path d="M7.5 3.5h7M7.5 7.5h7M7.5 11.5h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
      </ToolbarButton>
      <div className="toolbar-divider" />

      <div className="toolbar-dropdown" ref={colorPickerRef}>
        <ToolbarButton
          onClick={(e) => { preventAndFocus(e); setShowColorPicker(!showColorPicker); setShowBgColorPicker(false); }}
          title="Textfarbe"
          onMouseDown={preventAndFocus}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><text x="4" y="11" fontSize="11" fontWeight="700" fill={currentTextColor} fontFamily="'Segoe UI', Arial, sans-serif">A</text><path d="M2 12.5h12" stroke={currentTextColor} strokeWidth="2.5" strokeLinecap="round"/></svg>
        </ToolbarButton>
        {showColorPicker && (
          <div className="toolbar-color-picker">
            <input type="color" value={currentTextColor} onChange={(e) => { setCurrentTextColor(e.target.value); applyTextColor(e.target.value, () => setShowColorPicker(false)); }} className="color-input" />
            <div className="color-picker-presets">
              {TEXT_COLOR_PRESETS.map(color => (
                <button key={color} type="button" className="color-preset" style={{ backgroundColor: color }} onClick={() => { setCurrentTextColor(color); applyTextColor(color, () => setShowColorPicker(false)); }} title={color} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="toolbar-dropdown" ref={bgColorPickerRef}>
        <ToolbarButton
          onClick={(e) => { preventAndFocus(e); setShowBgColorPicker(!showBgColorPicker); setShowColorPicker(false); }}
          title="Hintergrundfarbe"
          onMouseDown={preventAndFocus}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><text x="4" y="11" fontSize="11" fontWeight="700" fill="currentColor" fontFamily="'Segoe UI', Arial, sans-serif">A</text><rect x="2" y="9.5" width="12" height="2.5" fill={currentBgColor} opacity="0.7"/></svg>
        </ToolbarButton>
        {showBgColorPicker && (
          <div className="toolbar-color-picker">
            <input type="color" value={currentBgColor} onChange={(e) => { setCurrentBgColor(e.target.value); applyBackgroundColor(e.target.value, () => setShowBgColorPicker(false)); }} className="color-input" />
            <div className="color-picker-presets">
              {BG_COLOR_PRESETS.map(color => (
                <button key={color} type="button" className="color-preset" style={{ backgroundColor: color }} onClick={() => { setCurrentBgColor(color); applyBackgroundColor(color, () => setShowBgColorPicker(false)); }} title={color} />
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="toolbar-divider" />

      <ToolbarButton onClick={(e) => { preventAndFocus(e); formatText('justifyLeft'); }} title="Linksbündig">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2.5h9M2 6.5h7M2 10.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </ToolbarButton>
      <ToolbarButton onClick={(e) => { preventAndFocus(e); formatText('justifyCenter'); }} title="Zentriert">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2.5h12M3.5 6.5h9M2 10.5h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </ToolbarButton>
      <ToolbarButton onClick={(e) => { preventAndFocus(e); formatText('justifyRight'); }} title="Rechtsbündig">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M5 2.5h9M7 6.5h9M5 10.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </ToolbarButton>
    </div>
  );
};

export default TextEditorToolbar;
