/** Copies text, reporting whether it actually worked.
 *
 *  `navigator.clipboard.writeText` returns a promise that rejects more often
 *  than people expect — the document is not focused, the page is not a secure
 *  context, the browser refused the permission. Called without awaiting it,
 *  the rejection is swallowed and the UI cheerfully shows "Copied!" while the
 *  clipboard still holds whatever was there before. That is worse than an
 *  obvious failure: the person pastes the wrong thing into a terminal.
 *
 *  So: await it, fall back to the old execCommand path when it is unavailable
 *  or refuses, and return a boolean the caller must honour.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // The modern API. `navigator.clipboard` is undefined entirely on an
  // insecure origin, so the optional chaining is load-bearing, not caution.
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through. A rejection here is usually "document is not focused"
      // or a permission refusal, and the legacy path is not subject to either.
    }
  }

  return legacyCopy(text);
}

/** The pre-Clipboard-API approach: select hidden text and ask the document to
 *  copy the selection.
 *
 *  Deprecated, and still the only thing that works on an insecure origin or
 *  when the async permission is refused. */
function legacyCopy(text: string): boolean {
  if (typeof document === 'undefined') return false;

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');

  // Rendered but invisible. `display: none` or `hidden` cannot be selected,
  // and a visible element would scroll the page as it takes focus.
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';

  document.body.appendChild(textarea);

  // Remember what the user had selected and put it back afterwards, so
  // copying a command does not wipe out text they had highlighted.
  const previous = document.getSelection()?.rangeCount
    ? document.getSelection()!.getRangeAt(0)
    : null;

  let copied = false;
  try {
    textarea.select();
    // iOS ignores select() on a readonly field without an explicit range.
    textarea.setSelectionRange(0, text.length);
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  } finally {
    document.body.removeChild(textarea);
    if (previous) {
      const selection = document.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(previous);
    }
  }

  return copied;
}
