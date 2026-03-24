/**
 * Formatierungslogik für den Rich-Text-Editor (Listen, Ausrichtung, etc.)
 */

const BLOCK_TAGS = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'];

const findBlockElement = (container, editorRef) => {
  let blockElement = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
  while (blockElement && blockElement !== editorRef.current) {
    if (BLOCK_TAGS.includes(blockElement.tagName)) break;
    blockElement = blockElement.parentElement;
  }
  return blockElement;
};

export const executeListCommand = (editorRef, selection, range, command, setContent) => {
  const listType = command === 'insertUnorderedList' ? 'UL' : 'OL';
  const container = range.commonAncestorContainer;
  const blockElement = findBlockElement(container, editorRef);
  let success = false;

  if (blockElement?.tagName === 'LI') {
    const list = blockElement.parentElement;
    if (list && (list.tagName === 'UL' || list.tagName === 'OL')) {
      if (list.tagName === listType) {
        const listItems = Array.from(list.querySelectorAll('li'));
        listItems.forEach(li => {
          const p = document.createElement('p');
          p.innerHTML = li.innerHTML || '\u200B';
          list.parentElement.insertBefore(p, list);
        });
        list.remove();
      } else {
        const newList = document.createElement(listType);
        Array.from(list.querySelectorAll('li')).forEach(li => {
          const newLi = document.createElement('li');
          newLi.innerHTML = li.innerHTML || '\u200B';
          newList.appendChild(newLi);
        });
        list.parentElement.replaceChild(newList, list);
      }
      success = true;
    }
  } else if (blockElement && blockElement !== editorRef.current) {
    const selectedText = selection.toString().trim();
    const blockText = blockElement.textContent.trim();
    const textToUse = selectedText || blockText || 'List item';
    const newList = document.createElement(listType);
    const newLi = document.createElement('li');

    if (selectedText && range.toString().trim()) {
      newLi.appendChild(document.createTextNode(textToUse));
      newList.appendChild(newLi);
      try {
        range.deleteContents();
        range.insertNode(newList);
      } catch {
        blockElement.parentElement.replaceChild(newList, blockElement);
        newLi.textContent = textToUse;
      }
    } else {
      newLi.innerHTML = blockElement.innerHTML || textToUse;
      newList.appendChild(newLi);
      blockElement.parentElement.replaceChild(newList, blockElement);
    }
    success = true;
  } else {
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

  if (success && editorRef.current) {
    const firstLi = editorRef.current.querySelector('li');
    if (firstLi) {
      const r = document.createRange();
      r.selectNodeContents(firstLi);
      r.collapse(false);
      selection.removeAllRanges();
      selection.addRange(r);
    }
  }
  return success;
};

export const executeJustifyCommand = (editorRef, selection, range, command, setContent) => {
  const container = range.commonAncestorContainer;
  const blockElement = findBlockElement(container, editorRef);
  let success = false;

  const setAlign = (el, cmd) => {
    if (cmd === 'justifyLeft') el.style.textAlign = 'left';
    else if (cmd === 'justifyCenter') el.style.textAlign = 'center';
    else if (cmd === 'justifyRight') el.style.textAlign = 'right';
  };

  if (blockElement?.tagName === 'LI') {
    const listContainer = blockElement.parentElement;
    if (listContainer && (listContainer.tagName === 'UL' || listContainer.tagName === 'OL')) {
      listContainer.querySelectorAll('li').forEach(li => setAlign(li, command));
    } else {
      setAlign(blockElement, command);
    }
    success = true;
  } else if (blockElement && blockElement !== editorRef.current) {
    setAlign(blockElement, command);
    success = true;
  } else {
    const p = document.createElement('p');
    p.innerHTML = range.toString() || '\u200B';
    setAlign(p, command);
    range.deleteContents();
    range.insertNode(p);
    success = true;
  }
  return success;
};

const FORMAT_BLOCK_TAGS = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

/**
 * Absatz / Überschrift wie in Word: formatBlock (h1–h6, p), mit DOM-Fallback wenn der Browser nichts tut.
 */
export const executeFormatBlock = (editorRef, selection, range, tagName) => {
  const tag = String(tagName).replace(/[<>]/g, '').toLowerCase();
  if (!FORMAT_BLOCK_TAGS.includes(tag)) return false;

  const tryFormatBlock = (t) => {
    try {
      return document.execCommand('formatBlock', false, t);
    } catch {
      return false;
    }
  };

  let success = tryFormatBlock(tag);
  if (!success && /^h[1-6]$/.test(tag)) {
    success = tryFormatBlock(`<${tag}>`);
  }
  if (!success && (tag === 'p' || tag === 'div')) {
    success = tryFormatBlock(`<${tag}>`);
  }

  if (success) return true;

  const container = range.commonAncestorContainer;
  let blockElement = findBlockElement(container, editorRef);

  if (blockElement && blockElement !== editorRef.current) {
    const el = document.createElement(tag);
    el.innerHTML = blockElement.innerHTML || '\u200B';
    blockElement.parentNode.replaceChild(el, blockElement);
    try {
      const r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(false);
      selection.removeAllRanges();
      selection.addRange(r);
    } catch {
      /* ignore */
    }
    return true;
  }

  if (editorRef.current) {
    const el = document.createElement(tag);
    el.innerHTML = '\u200B';
    editorRef.current.appendChild(el);
    try {
      const r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(true);
      selection.removeAllRanges();
      selection.addRange(r);
    } catch {
      /* ignore */
    }
    return true;
  }

  return false;
};

export const ensureSelectionRange = (editorRef, selection) => {
  let range;
  if (selection.rangeCount > 0) {
    range = selection.getRangeAt(0);
  } else {
    range = document.createRange();
    if (editorRef.current.childNodes.length === 0) {
      editorRef.current.appendChild(document.createTextNode('\u200B'));
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
  if (!editorRef.current.contains(range.commonAncestorContainer)) {
    range.selectNodeContents(editorRef.current);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  return range;
};
