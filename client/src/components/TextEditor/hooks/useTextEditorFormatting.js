import { useCallback } from 'react';
import {
  executeListCommand,
  executeJustifyCommand,
  ensureSelectionRange,
  executeFormatBlock
} from '../utils/textEditorFormatting';

export const useTextEditorFormatting = (editorRef, setContent) => {
  const formatText = useCallback((command, value = null) => {
    if (!editorRef.current) return;

    editorRef.current.focus();
    requestAnimationFrame(() => {
      const selection = window.getSelection();
      const range = ensureSelectionRange(editorRef, selection);
      let success = false;

      try {
        if (command === 'insertUnorderedList' || command === 'insertOrderedList') {
          success = executeListCommand(editorRef, selection, range, command, setContent);
        } else if (command.startsWith('justify')) {
          success = executeJustifyCommand(editorRef, selection, range, command, setContent);
        } else if (command === 'formatBlock' && value != null) {
          const tag = String(value).replace(/[<>]/g, '').toLowerCase();
          success = executeFormatBlock(editorRef, selection, range, tag);
        } else {
          success = document.execCommand(command, false, value);
        }

        if (success) {
          setContent(editorRef.current.innerHTML);
          editorRef.current.focus();
        }
      } catch (error) {
        console.error(`Error executing command ${command}:`, error);
      }
    });
  }, [editorRef, setContent]);

  const applyColor = useCallback((command, color, onClose) => {
    if (!editorRef.current) return;

    editorRef.current.focus();
    requestAnimationFrame(() => {
      const selection = window.getSelection();
      ensureSelectionRange(editorRef, selection);
      try {
        document.execCommand(command, false, color);
        setContent(editorRef.current.innerHTML);
        editorRef.current.focus();
        onClose?.();
      } catch (error) {
        console.error('Error applying color:', error);
      }
    });
  }, [editorRef, setContent]);

  const applyTextColor = useCallback((color, onClose) => {
    applyColor('foreColor', color, onClose);
  }, [applyColor]);

  const applyBackgroundColor = useCallback((color, onClose) => {
    applyColor('backColor', color, onClose);
  }, [applyColor]);

  return { formatText, applyTextColor, applyBackgroundColor };
};
