/**
 * Security and sanitization utilities against Cross-Site Scripting (XSS).
 */

export function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Basic markdown parser converting headers, bold, code, and links safely.
 */
export function renderBasicMarkdown(text) {
  if (!text) return '';
  let safe = escapeHTML(text);

  // Headers (###, ##, #)
  safe = safe.replace(/^### (.*$)/gim, '<h4 style="margin: 0.5rem 0; color: #38bdf8;">$1</h4>');
  safe = safe.replace(/^## (.*$)/gim, '<h3 style="margin: 0.75rem 0; color: #c084fc;">$1</h3>');
  safe = safe.replace(/^# (.*$)/gim, '<h2 style="margin: 1rem 0; color: #f8fafc;">$1</h2>');

  // Bold & Italic
  safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Inline code
  safe = safe.replace(/`([^`]+)`/g, '<code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.85em;">$1</code>');

  // Bullet lists
  safe = safe.replace(/^\s*-\s+(.*$)/gim, '<li style="margin-right: 1.2rem; margin-bottom: 4px;">$1</li>');

  // Horizontal rules
  safe = safe.replace(/^\s*---+\s*$/gim, '<hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.12); margin: 1rem 0;">');

  // Newlines to <br>
  safe = safe.replace(/\n/g, '<br>');

  return safe;
}
