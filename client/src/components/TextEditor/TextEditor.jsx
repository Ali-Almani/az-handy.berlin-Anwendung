import { useState, useRef, useEffect } from 'react';
import './TextEditor.scss';

const TextEditor = ({ initialContent = '', onSave, placeholder = 'Schreiben Sie hier...' }) => {
  const [content, setContent] = useState(initialContent);
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

  // Load saved content on mount
  useEffect(() => {
    const saved = localStorage.getItem('dashboard-content');
    if (saved && !initialContent) {
      setContent(saved);
    } else if (initialContent) {
      setContent(initialContent);
    }
  }, [initialContent]);

  // Focus editor when editing starts
  useEffect(() => {
    if (isEditing && editorRef.current) {
      editorRef.current.focus();
      // Set cursor to end if content exists
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

  // Close heading menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (headingMenuRef.current && !headingMenuRef.current.contains(event.target)) {
        setShowHeadingMenu(false);
      }
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
        setShowColorPicker(false);
      }
      if (bgColorPickerRef.current && !bgColorPickerRef.current.contains(event.target)) {
        setShowBgColorPicker(false);
      }
    };

    if (showHeadingMenu || showColorPicker || showBgColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showHeadingMenu, showColorPicker, showBgColorPicker]);

  const handleInput = (e) => {
    const newContent = e.target.innerHTML;
    setContent(newContent);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(content);
    }
    setIsEditing(false);
    localStorage.setItem('dashboard-content', content);
  };

  const handleCancel = () => {
    const saved = localStorage.getItem('dashboard-content');
    setContent(saved || initialContent || '');
    setIsEditing(false);
  };

  const formatText = (command, value = null) => {
    if (!editorRef.current) {
      return;
    }
    
    // Force focus on editor
    editorRef.current.focus();
    
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      const selection = window.getSelection();
      let range = null;
      
      // Get or create selection range
      if (selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        range = document.createRange();
        // If editor is empty, create a text node
        if (editorRef.current.childNodes.length === 0) {
          const textNode = document.createTextNode('\u200B'); // Zero-width space
          editorRef.current.appendChild(textNode);
        }
        // Select the last node or all content
        const lastNode = editorRef.current.lastChild;
        if (lastNode) {
          const nodeLength = lastNode.nodeType === Node.TEXT_NODE ? lastNode.length : lastNode.childNodes.length;
          range.setStart(lastNode, nodeLength);
          range.setEnd(lastNode, nodeLength);
        } else {
          range.selectNodeContents(editorRef.current);
        }
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      // Ensure range is within editor
      if (!editorRef.current.contains(range.commonAncestorContainer)) {
        range.selectNodeContents(editorRef.current);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      // Execute command
      try {
        let success = false;
        
        // Handle different command types
        if (command === 'insertUnorderedList' || command === 'insertOrderedList') {
          const listType = command === 'insertUnorderedList' ? 'UL' : 'OL';
          const container = range.commonAncestorContainer;
          let blockElement = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
          
          // Find the block-level element
          while (blockElement && blockElement !== editorRef.current) {
            if (['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'].includes(blockElement.tagName)) {
              break;
            }
            blockElement = blockElement.parentElement;
          }
          
          // If we're already in a list item
          if (blockElement && blockElement.tagName === 'LI') {
            const list = blockElement.parentElement;
            if (list && (list.tagName === 'UL' || list.tagName === 'OL')) {
              // If it's the same list type, toggle off (convert to paragraphs)
              if (list.tagName === listType) {
                // Convert all list items in this list to paragraphs
                const listItems = Array.from(list.querySelectorAll('li'));
                listItems.forEach(li => {
                  const p = document.createElement('p');
                  p.innerHTML = li.innerHTML || '\u200B';
                  list.parentElement.insertBefore(p, list);
                });
                list.remove();
                success = true;
              } else {
                // Different list type - convert to the new type
                const newList = document.createElement(listType);
                const listItems = Array.from(list.querySelectorAll('li'));
                listItems.forEach(li => {
                  const newLi = document.createElement('li');
                  newLi.innerHTML = li.innerHTML || '\u200B';
                  newList.appendChild(newLi);
                });
                list.parentElement.replaceChild(newList, list);
                success = true;
              }
            }
          } else if (blockElement && blockElement !== editorRef.current) {
            // We're in a paragraph or heading - convert to list
            const selectedText = selection.toString().trim();
            const blockText = blockElement.textContent.trim();
            
            // If there's selected text, use it; otherwise use the whole block
            const textToUse = selectedText || blockText || 'List item';
            
            // Create new list
            const newList = document.createElement(listType);
            const newLi = document.createElement('li');
            
            // If there was selected text, replace it; otherwise replace the whole block
            if (selectedText && range.toString().trim()) {
              // Replace selected text with list
              const textNode = document.createTextNode(textToUse);
              newLi.appendChild(textNode);
              newList.appendChild(newLi);
              
              try {
                range.deleteContents();
                range.insertNode(newList);
                success = true;
              } catch (e) {
                // Fallback: replace the whole block
                blockElement.parentElement.replaceChild(newList, blockElement);
                newLi.textContent = textToUse;
                success = true;
              }
            } else {
              // Replace the whole block element
              newLi.innerHTML = blockElement.innerHTML || textToUse;
              newList.appendChild(newLi);
              blockElement.parentElement.replaceChild(newList, blockElement);
              success = true;
            }
          } else {
            // No block element found - create a new paragraph first, then convert to list
            const p = document.createElement('p');
            p.textContent = '\u200B';
            editorRef.current.appendChild(p);
            
            const newList = document.createElement(listType);
            const newLi = document.createElement('li');
            newLi.textContent = 'List item';
            newList.appendChild(newLi);
            
            p.parentElement.replaceChild(newList, p);
            success = true;
          }
          
          // Focus on the first list item
          if (success && editorRef.current) {
            const firstLi = editorRef.current.querySelector('li');
            if (firstLi) {
              const range = document.createRange();
              range.selectNodeContents(firstLi);
              range.collapse(false);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        } else if (command.startsWith('justify')) {
          // Handle text alignment
          const container = range.commonAncestorContainer;
          let blockElement = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
          
          // Find block-level element (including list items)
          while (blockElement && blockElement !== editorRef.current) {
            if (['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'].includes(blockElement.tagName)) {
              break;
            }
            blockElement = blockElement.parentElement;
          }
          
          // If we're in a list item, apply to the list container instead
          if (blockElement && blockElement.tagName === 'LI') {
            const listContainer = blockElement.parentElement;
            if (listContainer && (listContainer.tagName === 'UL' || listContainer.tagName === 'OL')) {
              // Apply alignment to all list items in the list
              const listItems = listContainer.querySelectorAll('li');
              listItems.forEach(li => {
                if (command === 'justifyLeft') {
                  li.style.textAlign = 'left';
                } else if (command === 'justifyCenter') {
                  li.style.textAlign = 'center';
                } else if (command === 'justifyRight') {
                  li.style.textAlign = 'right';
                }
              });
              success = true;
            } else {
              // Apply to the list item itself
              if (command === 'justifyLeft') {
                blockElement.style.textAlign = 'left';
              } else if (command === 'justifyCenter') {
                blockElement.style.textAlign = 'center';
              } else if (command === 'justifyRight') {
                blockElement.style.textAlign = 'right';
              }
              success = true;
            }
          } else if (blockElement && blockElement !== editorRef.current) {
            // Set alignment directly on block element
            if (command === 'justifyLeft') {
              blockElement.style.textAlign = 'left';
            } else if (command === 'justifyCenter') {
              blockElement.style.textAlign = 'center';
            } else if (command === 'justifyRight') {
              blockElement.style.textAlign = 'right';
            }
            success = true;
          } else {
            // Create a paragraph if no block element exists
            const p = document.createElement('p');
            p.innerHTML = range.toString() || '\u200B';
            if (command === 'justifyLeft') {
              p.style.textAlign = 'left';
            } else if (command === 'justifyCenter') {
              p.style.textAlign = 'center';
            } else if (command === 'justifyRight') {
              p.style.textAlign = 'right';
            }
            range.deleteContents();
            range.insertNode(p);
            success = true;
          }
        } else {
          // Standard commands (bold, italic, underline, etc.)
          success = document.execCommand(command, false, value);
        }
        
        // Update content
        setContent(editorRef.current.innerHTML);
        
        // Restore focus and selection
        editorRef.current.focus();
        
      } catch (error) {
        console.error(`Error executing command ${command}:`, error);
      }
    });
  };

  const insertHeading = (level) => {
    formatText('formatBlock', `<h${level}>`);
    setShowHeadingMenu(false);
  };

  const applyTextColor = (color) => {
    if (!editorRef.current) return;
    
    editorRef.current.focus();
    
    requestAnimationFrame(() => {
      const selection = window.getSelection();
      let range = null;
      
      if (selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        range = document.createRange();
        if (editorRef.current.childNodes.length === 0) {
          const textNode = document.createTextNode('\u200B');
          editorRef.current.appendChild(textNode);
        }
        const lastNode = editorRef.current.lastChild;
        if (lastNode) {
          const nodeLength = lastNode.nodeType === Node.TEXT_NODE ? lastNode.length : lastNode.childNodes.length;
          range.setStart(lastNode, nodeLength);
          range.setEnd(lastNode, nodeLength);
        } else {
          range.selectNodeContents(editorRef.current);
        }
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      try {
        // Use execCommand to apply foreground color
        document.execCommand('foreColor', false, color);
        setContent(editorRef.current.innerHTML);
        editorRef.current.focus();
        setShowColorPicker(false);
      } catch (error) {
        console.error('Error applying text color:', error);
      }
    });
  };

  const applyBackgroundColor = (color) => {
    if (!editorRef.current) return;
    
    editorRef.current.focus();
    
    requestAnimationFrame(() => {
      const selection = window.getSelection();
      let range = null;
      
      if (selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        range = document.createRange();
        if (editorRef.current.childNodes.length === 0) {
          const textNode = document.createTextNode('\u200B');
          editorRef.current.appendChild(textNode);
        }
        const lastNode = editorRef.current.lastChild;
        if (lastNode) {
          const nodeLength = lastNode.nodeType === Node.TEXT_NODE ? lastNode.length : lastNode.childNodes.length;
          range.setStart(lastNode, nodeLength);
          range.setEnd(lastNode, nodeLength);
        } else {
          range.selectNodeContents(editorRef.current);
        }
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      try {
        // Use execCommand to apply background color
        document.execCommand('backColor', false, color);
        setContent(editorRef.current.innerHTML);
        editorRef.current.focus();
        setShowBgColorPicker(false);
      } catch (error) {
        console.error('Error applying background color:', error);
      }
    });
  };

  const handleKeyDown = (e) => {
    // Allow Ctrl/Cmd + B, I, U for formatting
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
      if (e.key === 'b') {
        e.preventDefault();
        formatText('bold');
      } else if (e.key === 'i') {
        e.preventDefault();
        formatText('italic');
      } else if (e.key === 'u') {
        e.preventDefault();
        formatText('underline');
      }
    }
    
    // Escape to cancel editing
    if (e.key === 'Escape' && isEditing) {
      handleCancel();
    }
  };

  const startEditing = () => {
    setIsEditing(true);
  };

  return (
    <div className="text-editor">
      {isEditing ? (
        <>
          <div className="text-editor-toolbar">
            <button
              type="button"
              onClick={() => formatText('bold')}
              className="toolbar-btn"
              title="Fett (Ctrl+B)"
              onMouseDown={(e) => {
                e.preventDefault();
                if (editorRef.current) {
                  editorRef.current.focus();
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <text x="4" y="12" fontSize="12" fontWeight="700" fill="currentColor" fontFamily="'Segoe UI', Arial, sans-serif">B</text>
              </svg>
            </button>
            <button
              type="button"
              onClick={() => formatText('italic')}
              className="toolbar-btn"
              title="Kursiv (Ctrl+I)"
              onMouseDown={(e) => {
                e.preventDefault();
                if (editorRef.current) {
                  editorRef.current.focus();
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <text x="5" y="12" fontSize="12" fontStyle="italic" fill="currentColor" fontFamily="'Segoe UI', Arial, sans-serif">I</text>
              </svg>
            </button>
            <button
              type="button"
              onClick={() => formatText('underline')}
              className="toolbar-btn"
              title="Unterstrichen (Ctrl+U)"
              onMouseDown={(e) => {
                e.preventDefault();
                if (editorRef.current) {
                  editorRef.current.focus();
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <text x="4" y="12" fontSize="12" fill="currentColor" fontFamily="'Segoe UI', Arial, sans-serif">U</text>
                <path d="M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            <div className="toolbar-divider"></div>
            
            <div className="toolbar-dropdown" ref={headingMenuRef}>
              <button
                type="button"
                onClick={() => setShowHeadingMenu(!showHeadingMenu)}
                className="toolbar-btn"
                title="Überschrift"
                onMouseDown={(e) => e.preventDefault()}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <text x="4" y="11" fontSize="11" fontWeight="700" fill="currentColor" fontFamily="'Segoe UI', Arial, sans-serif">H</text>
                  <path d="M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
              {showHeadingMenu && (
                <div className="toolbar-dropdown-menu">
                  <button
                    type="button"
                    onClick={() => insertHeading(1)}
                    className="toolbar-dropdown-item"
                  >
                    Überschrift 1
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHeading(2)}
                    className="toolbar-dropdown-item"
                  >
                    Überschrift 2
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHeading(3)}
                    className="toolbar-dropdown-item"
                  >
                    Überschrift 3
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHeading(4)}
                    className="toolbar-dropdown-item"
                  >
                    Überschrift 4
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHeading(5)}
                    className="toolbar-dropdown-item"
                  >
                    Überschrift 5
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHeading(6)}
                    className="toolbar-dropdown-item"
                  >
                    Überschrift 6
                  </button>
                </div>
              )}
            </div>
            
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                formatText('insertUnorderedList');
              }}
              className="toolbar-btn"
              title="Aufzählung"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="2.5" cy="4" r="0.8" fill="currentColor"/>
                <circle cx="2.5" cy="8" r="0.8" fill="currentColor"/>
                <circle cx="2.5" cy="12" r="0.8" fill="currentColor"/>
                <path d="M5 4h9M5 8h9M5 12h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                formatText('insertOrderedList');
              }}
              className="toolbar-btn"
              title="Nummerierte Liste"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <text x="1.5" y="5.5" fontSize="7" fontWeight="600" fill="currentColor" fontFamily="'Segoe UI', Arial, sans-serif">1</text>
                <text x="1.5" y="9.5" fontSize="7" fontWeight="600" fill="currentColor" fontFamily="'Segoe UI', Arial, sans-serif">2</text>
                <text x="1.5" y="13.5" fontSize="7" fontWeight="600" fill="currentColor" fontFamily="'Segoe UI', Arial, sans-serif">3</text>
                <path d="M7.5 3.5h7M7.5 7.5h7M7.5 11.5h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </button>
            <div className="toolbar-divider"></div>
            
            <div className="toolbar-dropdown" ref={colorPickerRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowColorPicker(!showColorPicker);
                  setShowBgColorPicker(false);
                }}
                className="toolbar-btn"
                title="Textfarbe"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                style={{ position: 'relative' }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <text x="4" y="11" fontSize="11" fontWeight="700" fill={currentTextColor} fontFamily="'Segoe UI', Arial, sans-serif">A</text>
                  <path d="M2 12.5h12" stroke={currentTextColor} strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </button>
              {showColorPicker && (
                <div className="toolbar-color-picker">
                  <input
                    type="color"
                    value={currentTextColor}
                    onChange={(e) => {
                      setCurrentTextColor(e.target.value);
                      applyTextColor(e.target.value);
                    }}
                    className="color-input"
                  />
                  <div className="color-picker-presets">
                    {['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        className="color-preset"
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          setCurrentTextColor(color);
                          applyTextColor(color);
                        }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="toolbar-dropdown" ref={bgColorPickerRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowBgColorPicker(!showBgColorPicker);
                  setShowColorPicker(false);
                }}
                className="toolbar-btn"
                title="Hintergrundfarbe"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                style={{ position: 'relative' }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <text x="4" y="11" fontSize="11" fontWeight="700" fill="currentColor" fontFamily="'Segoe UI', Arial, sans-serif">A</text>
                  <rect x="2" y="9.5" width="12" height="2.5" fill={currentBgColor} opacity="0.7"/>
                </svg>
              </button>
              {showBgColorPicker && (
                <div className="toolbar-color-picker">
                  <input
                    type="color"
                    value={currentBgColor}
                    onChange={(e) => {
                      setCurrentBgColor(e.target.value);
                      applyBackgroundColor(e.target.value);
                    }}
                    className="color-input"
                  />
                  <div className="color-picker-presets">
                    {['#FFFFFF', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000', '#000000'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        className="color-preset"
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          setCurrentBgColor(color);
                          applyBackgroundColor(color);
                        }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="toolbar-divider"></div>
            
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                formatText('justifyLeft');
              }}
              className="toolbar-btn"
              title="Linksbündig"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 2.5h9M2 6.5h7M2 10.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                formatText('justifyCenter');
              }}
              className="toolbar-btn"
              title="Zentriert"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 2.5h12M3.5 6.5h9M2 10.5h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                formatText('justifyRight');
              }}
              className="toolbar-btn"
              title="Rechtsbündig"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 2.5h9M7 6.5h9M5 10.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          
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
            <button onClick={handleSave} className="btn btn--primary btn--small">
              Speichern
            </button>
            <button onClick={handleCancel} className="btn btn--outline btn--small">
              Abbrechen
            </button>
          </div>
        </>
      ) : (
        <>
          <div
            className="text-editor-display"
            onClick={startEditing}
            dangerouslySetInnerHTML={{ 
              __html: content || `<p style="color: #999; font-style: italic;">${placeholder}</p>` 
            }}
          />
          <button
            onClick={startEditing}
            className="btn btn--outline btn--small"
            style={{ marginTop: '20px', marginBottom: '20px', marginLeft: '20px' }}
          >
            Bearbeiten
          </button>
        </>
      )}
    </div>
  );
};

export default TextEditor;
