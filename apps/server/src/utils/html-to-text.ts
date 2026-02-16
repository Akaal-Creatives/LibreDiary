/**
 * Strip HTML tags, decode common entities, and normalise whitespace.
 * Designed to produce plain-text suitable for full-text search indexing.
 */
export function htmlToText(html: string): string {
  if (!html) return '';

  let text = html;

  // Replace block-level tags with newlines for readability
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|blockquote|pre|br\s*\/?)>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // Strip all remaining HTML tags (loop to handle nested/malformed markup like <<script>script>)
  let prev = '';
  do {
    prev = text;
    text = text.replace(/<[^>]*>/g, '');
  } while (text !== prev);

  // Decode common HTML entities (decode &amp; last to avoid double-unescaping e.g. &amp;lt; → &lt; → <)
  text = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, '&');

  // Normalise whitespace: collapse runs of spaces/tabs, trim lines, collapse blank lines
  text = text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}
