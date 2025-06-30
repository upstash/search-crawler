export function cleanTextContent(text: string): string {
  return text
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style tags
    .replace(/<[^>]+>/g, ' ') // Remove all HTML tags
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .replace(/[{}:;]/g, ' ') // Remove CSS syntax
    .replace(/\b(var|function|const|let|return|if|else|for|while)\b/g, '') // Remove JS keywords
    .replace(/[a-zA-Z-]+-[a-zA-Z0-9-]*/g, '') // Remove CSS-like class names
    .replace(/\b[a-zA-Z-]+\b(?=\s*\{)/g, '') // Remove CSS selectors
    .replace(/\s+/g, ' ') // Clean up whitespace again
    .trim();
}
