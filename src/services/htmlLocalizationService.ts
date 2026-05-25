import { LocalizableString } from '../models/localization';
import { parseCsvText } from '../utils/fileUtils';

interface ParsedTranslatedCsvRow {
  key: string;
  source: string;
  translation: string;
}

export interface ParsedTranslatedCsv {
  sourceLocale: string | null;
  rows: ParsedTranslatedCsvRow[];
}

const BLOCK_TAGS = new Set([
  'ADDRESS',
  'ARTICLE',
  'ASIDE',
  'BLOCKQUOTE',
  'BR',
  'BUTTON',
  'CAPTION',
  'DIV',
  'DL',
  'FIELDSET',
  'FIGCAPTION',
  'FIGURE',
  'FOOTER',
  'FORM',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'HEADER',
  'HR',
  'LI',
  'MAIN',
  'NAV',
  'OL',
  'P',
  'PRE',
  'SECTION',
  'TABLE',
  'TBODY',
  'TD',
  'TFOOT',
  'TH',
  'THEAD',
  'TR',
  'UL',
]);
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT']);

const escapeCsvValue = (value: string) => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
};

const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();

const hasBlockChildren = (element: Element) =>
  Array.from(element.children).some((child) => !SKIP_TAGS.has(child.tagName) && BLOCK_TAGS.has(child.tagName));

const parseDocument = (content: string) => new DOMParser().parseFromString(content, 'text/html');

const buildPath = (node: Node): string => {
  const parts: string[] = [];
  let current: Node | null = node;
  while (current && current !== current.ownerDocument) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const el = current as Element;
      const tag = el.tagName.toLowerCase();
      const parent = el.parentNode;
      let idx = 1;
      if (parent) {
        const siblings = Array.from(parent.childNodes).filter(
          (n) => n.nodeType === Node.ELEMENT_NODE && (n as Element).tagName === el.tagName
        );
        idx = siblings.indexOf(el) + 1;
      }
      parts.unshift(`/${tag}[${idx}]`);
    } else if (current.nodeType === Node.TEXT_NODE) {
      const parent = current.parentNode;
      if (parent) {
        const textNodes = Array.from(parent.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE);
        const idx = textNodes.indexOf(current as Text) + 1;
        parts.unshift(`/#text[${idx}]`);
      }
    }
    current = current.parentNode;
  }
  return parts.join('');
};

export const htmlLocalizationService = {
  extractStrings(html: string): LocalizableString[] {
    const document = parseDocument(html);
    const results: LocalizableString[] = [];
    let counter = 0;

    const pushValue = (context: string, value: string, type: 'text' | 'html', path: string, attribute: string) => {
      const normalizedValue = type === 'html' ? value.trim() : normalizeText(value);
      if (!normalizedValue) {
        return;
      }

      counter += 1;
      const key = context === 'subject' && counter === 1 ? 'subject' : `${type}_${counter}`;
      results.push({ key, value: normalizedValue, context, type, path, attribute });
    };

    // Subject from <title>
    if (document.title.trim()) {
      const titleEl = document.querySelector('title');
      const path = titleEl ? buildPath(titleEl) + '/#text[1]' : '/html[1]/head[1]/title[1]/#text[1]';
      pushValue('subject', document.title, 'text', path, '');
    }

    const visitElement = (element: Element) => {
      if (SKIP_TAGS.has(element.tagName)) {
        return;
      }

      // Alt attribute
      const altValue = element.getAttribute('alt');
      if (altValue && altValue.trim()) {
        pushValue('alt', altValue, 'text', buildPath(element), 'alt');
      }

      // Title attribute
      const titleValue = element.getAttribute('title');
      if (titleValue && titleValue.trim()) {
        pushValue('title', titleValue, 'text', buildPath(element), 'title');
      }

      if (!hasBlockChildren(element)) {
        // Leaf element — check if it contains HTML (inline children like <a>, <span>, <strong>)
        const hasInlineChildren = element.children.length > 0;
        const textContent = element.textContent ?? '';
        const trimmed = normalizeText(textContent);
        if (!trimmed) return;

        if (hasInlineChildren) {
          // Contains inline markup — export as html type with innerHTML
          const innerHTML = element.innerHTML.trim();
          if (innerHTML) {
            pushValue('html', innerHTML, 'html', buildPath(element), '');
          }
        } else {
          // Plain text node
          const firstText = Array.from(element.childNodes).find((n) => n.nodeType === Node.TEXT_NODE && normalizeText(n.textContent ?? ''));
          const path = firstText ? buildPath(firstText) : buildPath(element) + '/#text[1]';
          pushValue('text', trimmed, 'text', path, '');
        }
        return;
      }

      Array.from(element.children).forEach((child) => visitElement(child));
    };

    Array.from(document.body.children).forEach((child) => visitElement(child));
    return results;
  },

  exportToCsv(strings: LocalizableString[], locale: string) {
    // Row 1: "Locale", key1, key2, ...
    const headerRow = ['Locale', ...strings.map((s) => s.key)].map(escapeCsvValue).join(',');
    // Row 2: "Locale", type1, type2, ...
    const typeRow = ['Locale', ...strings.map((s) => s.type)].map(escapeCsvValue).join(',');
    // Row 3: locale code, value1, value2, ...
    const dataRow = [locale.toUpperCase(), ...strings.map((s) => s.value)].map(escapeCsvValue).join(',');
    return [headerRow, typeRow, dataRow].join('\r\n');
  },

  generateLocalizedHtml(sourceHtml: string, originals: LocalizableString[], translations: Record<string, string>) {
    const document = parseDocument(sourceHtml);
    const orderedOriginals = originals.slice();
    let currentIndex = 0;

    const resolveValue = (original: LocalizableString | undefined) => {
      if (!original) {
        return null;
      }

      const translated = translations[original.key];
      return translated && translated.trim().length > 0 ? translated : original.value;
    };

    const takeNext = (context: string) => {
      const current = orderedOriginals[currentIndex];
      if (!current || current.context !== context) {
        return null;
      }

      currentIndex += 1;
      return current;
    };

    const subject = takeNext('subject');
    if (subject) {
      document.title = resolveValue(subject) ?? subject.value;
    }

    const visitElement = (element: Element) => {
      if (SKIP_TAGS.has(element.tagName)) {
        return;
      }

      const titleAttribute = normalizeText(element.getAttribute('title') ?? '');
      if (titleAttribute) {
        const original = takeNext('title');
        if (original) {
          element.setAttribute('title', resolveValue(original) ?? original.value);
        }
      }

      const altAttribute = normalizeText(element.getAttribute('alt') ?? '');
      if (altAttribute) {
        const original = takeNext('alt');
        if (original) {
          element.setAttribute('alt', resolveValue(original) ?? original.value);
        }
      }

      if (!hasBlockChildren(element)) {
        const textContent = element.textContent ?? '';
        const trimmed = normalizeText(textContent);
        if (!trimmed) return;

        const hasInlineChildren = element.children.length > 0;
        if (hasInlineChildren) {
          const original = takeNext('html');
          if (original) {
            element.innerHTML = resolveValue(original) ?? original.value;
          }
        } else {
          const original = takeNext('text');
          if (original) {
            element.textContent = resolveValue(original) ?? original.value;
          }
        }
        return;
      }

      Array.from(element.children).forEach((child) => visitElement(child));
    };

    Array.from(document.body.children).forEach((child) => visitElement(child));
    return `<!DOCTYPE html>\n${document.documentElement.outerHTML}`;
  },

  parseTranslatedCsv(csvText: string): ParsedTranslatedCsv {
    const rows = parseCsvText(csvText);
    if (rows.length === 0) {
      throw new Error('The CSV file is empty.');
    }

    const headers = rows[0].map((header) => header.trim());

    // Detect format: horizontal (Blazor-style) has "Locale" as first header and keys across columns
    // Vertical format has "Key", "Translation" columns
    if (headers[0]?.toLowerCase() === 'locale' && rows.length >= 3) {
      // Horizontal format: row 0 = keys, row 1 = types, row 2+ = locale rows
      const keys = headers.slice(1);
      // Find the translation row (non-source locale row, typically row index 2+)
      // The source row might already be there; any additional row is a translation
      const translationRow = rows.length > 2 ? rows[rows.length - 1] : rows[2];
      if (!translationRow) {
        throw new Error('No translation data found in the CSV.');
      }
      const sourceLocale = rows[2]?.[0] ?? null;
      return {
        sourceLocale,
        rows: keys.map((key, i) => ({
          key,
          source: rows[2]?.[i + 1] ?? '',
          translation: rows.length > 3 ? (translationRow[i + 1] ?? '') : '',
        })).filter((row) => row.key.length > 0),
      };
    }

    // Vertical format: columns include Key and Translation (XLSX converted to CSV)
    const keyIndex = headers.findIndex((header) => header.toLowerCase() === 'key');
    const translationIndex = headers.findIndex((header) => header.toLowerCase() === 'translation');
    const sourceIndex = headers.findIndex((header) => /^(source|original)(?:\s*\(([^)]+)\))?$/i.test(header));

    if (keyIndex < 0 || translationIndex < 0) {
      throw new Error('Expected Key and Translation columns in the uploaded file.');
    }

    const sourceHeader = sourceIndex >= 0 ? headers[sourceIndex] : '';
    const sourceLocaleMatch = sourceHeader.match(/^(?:source|original)\s*\(([^)]+)\)$/i);

    return {
      sourceLocale: sourceLocaleMatch?.[1] ?? null,
      rows: rows.slice(1).map((row) => ({
        key: (row[keyIndex] ?? '').trim(),
        source: row[sourceIndex] ?? '',
        translation: row[translationIndex] ?? '',
      })).filter((row) => row.key.length > 0),
    };
  },
};
