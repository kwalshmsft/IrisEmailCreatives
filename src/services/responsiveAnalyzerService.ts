export interface ResponsiveIssue {
  id: string;
  type:
    | 'fixed-width-table'
    | 'fixed-width-cell'
    | 'fixed-width-cell-overflow'
    | 'fixed-width-image'
    | 'fixed-width-container'
    | 'missing-viewport'
    | 'no-media-queries'
    | 'no-mso-conditionals'
    | 'outlook-no-width-fallback'
    | 'outlook-flex-grid';
  detail: string;
  element: string;
  fix: string;
  fixDetail: string;
}

export interface ResponsiveAnalysisResult {
  issues: ResponsiveIssue[];
  hasIssues: boolean;
}

const createDocument = (html: string) => new DOMParser().parseFromString(html, 'text/html');

const getDoctypePrefix = (html: string, doc: Document) => {
  if (/<!doctype/i.test(html)) {
    return '<!DOCTYPE html>';
  }

  return doc.doctype ? `<!DOCTYPE ${doc.doctype.name}>` : '';
};

const parsePixelWidth = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const match = value.match(/(\d+(?:\.\d+)?)\s*px/i) ?? value.match(/^(\d+(?:\.\d+)?)$/);
  return match ? Number(match[1]) : null;
};

const hasMediaQuery = (doc: Document) =>
  Array.from(doc.querySelectorAll('style')).some((styleTag) => (styleTag.textContent || '').includes('@media'));

const hasResponsiveFixAlready = (doc: Document) =>
  Array.from(doc.querySelectorAll('style')).some((styleTag) => {
    const text = styleTag.textContent || '';
    return text.includes('@media') && text.includes('max-width') && text.includes('img');
  });

const ensureHead = (doc: Document) => {
  if (doc.head) {
    return doc.head;
  }

  const head = doc.createElement('head');
  if (doc.documentElement.firstChild) {
    doc.documentElement.insertBefore(head, doc.documentElement.firstChild);
  } else {
    doc.documentElement.appendChild(head);
  }
  return head;
};

const appendUniqueStyle = (doc: Document, id: string, cssText: string) => {
  const head = ensureHead(doc);
  const existing = doc.getElementById(id);
  if (existing) {
    existing.textContent = cssText;
    return;
  }

  const styleTag = doc.createElement('style');
  styleTag.id = id;
  styleTag.textContent = cssText;
  head.appendChild(styleTag);
};

const serializeDocument = (originalHtml: string, doc: Document) => `${getDoctypePrefix(originalHtml, doc)}${doc.documentElement.outerHTML}`;

export const responsiveAnalyzerService = {
  analyze(html: string): ResponsiveAnalysisResult {
    if (!html.trim()) {
      return { issues: [], hasIssues: false };
    }

    const doc = createDocument(html);
    const issues: ResponsiveIssue[] = [];
    let issueCounter = 0;
    const nextId = () => `issue-${issueCounter++}`;

    const tables = Array.from(doc.querySelectorAll('table'));
    tables.forEach((table, index) => {
      const widthAttr = table.getAttribute('width');
      const styleWidth = parsePixelWidth((table.getAttribute('style') || '').match(/width\s*:\s*([^;]+)/i)?.[1]);

      if (widthAttr && !widthAttr.includes('%')) {
        issues.push({
          id: nextId(),
          type: 'fixed-width-table',
          detail: `Table with fixed width: ${widthAttr}px`,
          element: `table[${index}]`,
          fix: 'Convert to a responsive table with media queries.',
          fixDetail: `Replace width="${widthAttr}" with max-width styling and fluid width rules.`,
        });
      } else if (styleWidth && styleWidth > 480) {
        issues.push({
          id: nextId(),
          type: 'fixed-width-table',
          detail: `Table with fixed width: ${styleWidth}px (inline style)`,
          element: `table[${index}]`,
          fix: 'Convert to a responsive table with media queries.',
          fixDetail: `Replace width:${styleWidth}px with width:100% and max-width:${styleWidth}px.`,
        });
      }
    });

    const tableCells = Array.from(doc.querySelectorAll('td'));
    let extraCellIssues = 0;
    tableCells.forEach((cell, index) => {
      const widthAttr = parsePixelWidth(cell.getAttribute('width'));
      const styleWidth = parsePixelWidth((cell.getAttribute('style') || '').match(/width\s*:\s*([^;]+)/i)?.[1]);
      const width = widthAttr ?? styleWidth;

      if (width && width > 100) {
        if (extraCellIssues < 3) {
          issues.push({
            id: nextId(),
            type: 'fixed-width-cell',
            detail: `Table cell with fixed width: ${width}px`,
            element: `td[${index}]`,
            fix: 'Allow the cell to stack or stretch on mobile.',
            fixDetail: 'Use width:auto or block stacking rules in a mobile media query.',
          });
        }
        extraCellIssues += 1;
      }
    });

    if (extraCellIssues > 3) {
      issues.push({
        id: nextId(),
        type: 'fixed-width-cell-overflow',
        detail: `... and ${extraCellIssues - 3} more fixed-width table cells`,
        element: 'td',
        fix: 'Apply the same responsive cell fix to remaining cells.',
        fixDetail: 'Convert remaining fixed-width cells to fluid or stacked cells for mobile.',
      });
    }

    if (!hasResponsiveFixAlready(doc)) {
      Array.from(doc.querySelectorAll('img')).forEach((image, index) => {
        const styleText = image.getAttribute('style') || '';
        const width = parsePixelWidth(image.getAttribute('width')) ?? parsePixelWidth(styleText.match(/width\s*:\s*([^;]+)/i)?.[1]);
        const hasMaxWidth = /max-width\s*:/i.test(styleText);

        if (width && width > 200 && !hasMaxWidth) {
          issues.push({
            id: nextId(),
            type: 'fixed-width-image',
            detail: `Image with fixed width ${width}px and no max-width.`,
            element: `img[${index}]`,
            fix: 'Make the image responsive.',
            fixDetail: 'Add max-width:100%, width:100%, and height:auto for smaller screens.',
          });
        }
      });
    }

    Array.from(doc.querySelectorAll('div')).forEach((container, index) => {
      const styleWidth = parsePixelWidth((container.getAttribute('style') || '').match(/width\s*:\s*([^;]+)/i)?.[1]);
      if (styleWidth && styleWidth > 480) {
        issues.push({
          id: nextId(),
          type: 'fixed-width-container',
          detail: `div with fixed width: ${styleWidth}px`,
          element: `div[${index}]`,
          fix: 'Make the container fluid on mobile.',
          fixDetail: `Swap width:${styleWidth}px for width:100% and max-width:${styleWidth}px.`,
        });
      }
    });

    if (!doc.querySelector('meta[name="viewport"]')) {
      issues.push({
        id: nextId(),
        type: 'missing-viewport',
        detail: 'No viewport meta tag found.',
        element: 'head',
        fix: 'Add a viewport meta tag.',
        fixDetail: 'Adds <meta name="viewport" content="width=device-width, initial-scale=1">.',
      });
    }

    if (tables.length > 0 && !hasMediaQuery(doc)) {
      issues.push({
        id: nextId(),
        type: 'no-media-queries',
        detail: 'No @media query found for table-based layout.',
        element: 'style',
        fix: 'Add a mobile media query.',
        fixDetail: 'Adds stacking and image scaling rules for widths below 480px.',
      });
    }

    if (tables.length > 0 && !/<!--\[if\s+(?:gte\s+)?mso/i.test(html)) {
      issues.push({
        id: nextId(),
        type: 'no-mso-conditionals',
        detail: 'No MSO conditional comments found for Outlook.',
        element: 'html',
        fix: 'Add an Outlook conditional fallback.',
        fixDetail: 'Adds an MSO-only style block for table rendering compatibility.',
      });
    }

    // Outlook-specific: containers using max-width without a width attribute/fallback
    Array.from(doc.querySelectorAll('table, div')).forEach((el, index) => {
      const style = el.getAttribute('style') || '';
      const hasMaxWidth = /max-width\s*:/i.test(style);
      const hasWidth = /(?<!max-)width\s*:/i.test(style) || el.hasAttribute('width');
      if (hasMaxWidth && !hasWidth) {
        issues.push({
          id: nextId(),
          type: 'outlook-no-width-fallback',
          detail: `${el.tagName.toLowerCase()} uses max-width without a width fallback (Outlook ignores max-width).`,
          element: `${el.tagName.toLowerCase()}[${index}]`,
          fix: 'Add an explicit width for Outlook compatibility.',
          fixDetail: 'Adds width attribute matching max-width so Outlook constrains the element.',
        });
      }
    });

    // Outlook-specific: flex or grid display used
    let flexGridCount = 0;
    Array.from(doc.querySelectorAll('*')).forEach((el) => {
      const style = el.getAttribute('style') || '';
      if (/display\s*:\s*(flex|inline-flex|grid|inline-grid)/i.test(style)) {
        flexGridCount++;
      }
    });
    if (flexGridCount > 0) {
      issues.push({
        id: nextId(),
        type: 'outlook-flex-grid',
        detail: `${flexGridCount} element(s) use display:flex or display:grid (unsupported in Outlook desktop).`,
        element: 'multiple',
        fix: 'Add table-based fallback or MSO conditional.',
        fixDetail: 'Outlook renders flex/grid as block. Consider using table layout or <!--[if mso]> fallbacks.',
      });
    }

    return { issues, hasIssues: issues.length > 0 };
  },

  injectResponsiveCss(html: string, acceptedIssueTypes: string[] = []): string {
    if (!html.trim()) {
      return html;
    }

    const accepted = new Set(acceptedIssueTypes);
    const shouldApply = (type: string) => accepted.size === 0 || accepted.has(type);
    const doc = createDocument(html);

    if (shouldApply('missing-viewport') && !doc.querySelector('meta[name="viewport"]')) {
      const viewport = doc.createElement('meta');
      viewport.setAttribute('name', 'viewport');
      viewport.setAttribute('content', 'width=device-width, initial-scale=1');
      ensureHead(doc).prepend(viewport);
    }

    if (shouldApply('fixed-width-image')) {
      Array.from(doc.querySelectorAll('img')).forEach((image) => {
        const styleText = image.getAttribute('style') || '';
        const width = parsePixelWidth(image.getAttribute('width')) ?? parsePixelWidth(styleText.match(/width\s*:\s*([^;]+)/i)?.[1]);
        if (!width || width <= 100) {
          return;
        }

        image.removeAttribute('width');
        const declarations = styleText
          .split(';')
          .map((part) => part.trim())
          .filter(Boolean)
          .filter((part) => !/^width\s*:/i.test(part) && !/^max-width\s*:/i.test(part) && !/^height\s*:/i.test(part));
        declarations.unshift('width: 100%');
        declarations.unshift('max-width: 100%');
        declarations.unshift('height: auto');
        image.classList.add('responsive-image');
        image.setAttribute('style', `${Array.from(new Set(declarations)).join('; ')};`);
      });
    }

    if (shouldApply('fixed-width-table') || shouldApply('fixed-width-cell') || shouldApply('fixed-width-cell-overflow')) {
      Array.from(doc.querySelectorAll('table')).forEach((table) => {
        const widthAttr = parsePixelWidth(table.getAttribute('width'));
        const styleText = table.getAttribute('style') || '';
        const styleWidth = parsePixelWidth(styleText.match(/width\s*:\s*([^;]+)/i)?.[1]);
        const width = widthAttr ?? styleWidth;
        if (!width) {
          return;
        }

        table.removeAttribute('width');
        table.classList.add('responsive-table');
        const declarations = styleText
          .split(';')
          .map((part) => part.trim())
          .filter(Boolean)
          .filter((part) => !/^width\s*:/i.test(part) && !/^max-width\s*:/i.test(part));
        declarations.unshift(`max-width: ${width}px`);
        declarations.unshift('width: 100%');
        table.setAttribute('style', `${Array.from(new Set(declarations)).join('; ')};`);
      });
    }

    if (shouldApply('fixed-width-container')) {
      Array.from(doc.querySelectorAll('div')).forEach((container) => {
        const styleText = container.getAttribute('style') || '';
        const styleWidth = parsePixelWidth(styleText.match(/width\s*:\s*([^;]+)/i)?.[1]);
        if (!styleWidth || styleWidth <= 480) {
          return;
        }

        const declarations = styleText
          .split(';')
          .map((part) => part.trim())
          .filter(Boolean)
          .filter((part) => !/^width\s*:/i.test(part) && !/^max-width\s*:/i.test(part));
        declarations.unshift(`max-width: ${styleWidth}px`);
        declarations.unshift('width: 100%');
        container.setAttribute('style', `${Array.from(new Set(declarations)).join('; ')};`);
      });
    }

    if (shouldApply('no-media-queries') || shouldApply('fixed-width-image') || shouldApply('fixed-width-table')) {
      appendUniqueStyle(
        doc,
        'responsive-fix-css',
        [
          '.responsive-image { max-width: 100% !important; width: 100% !important; height: auto !important; }',
          'table.responsive-table { width: 100% !important; }',
          '@media only screen and (max-width: 480px) {',
          '  table.responsive-table,',
          '  table.responsive-table tbody,',
          '  table.responsive-table tr,',
          '  table.responsive-table td {',
          '    width: 100% !important;',
          '    max-width: 100% !important;',
          '    box-sizing: border-box !important;',
          '  }',
          '  img, img.responsive-image {',
          '    max-width: 100% !important;',
          '    width: 100% !important;',
          '    height: auto !important;',
          '  }',
          '}',
        ].join('\n')
      );
    }

    let serialized = serializeDocument(html, doc);

    if (shouldApply('no-mso-conditionals') && !/<!--\[if\s+(?:gte\s+)?mso/i.test(serialized)) {
      serialized = serialized.replace(
        /<\/head>/i,
        '<!--[if mso]><style type="text/css">table, td { border-collapse: collapse; }</style><![endif]--></head>'
      );
    }

    // Outlook fix: add explicit width where max-width is used without width
    if (shouldApply('outlook-no-width-fallback')) {
      const fixDoc = createDocument(serialized);
      Array.from(fixDoc.querySelectorAll('table, div')).forEach((el) => {
        const style = el.getAttribute('style') || '';
        const maxWidthMatch = style.match(/max-width\s*:\s*(\d+(?:\.\d+)?)\s*px/i);
        const hasWidth = /(?<!max-)width\s*:/i.test(style) || el.hasAttribute('width');
        if (maxWidthMatch && !hasWidth) {
          const widthValue = maxWidthMatch[1];
          if (el.tagName === 'TABLE') {
            el.setAttribute('width', widthValue);
          } else {
            el.setAttribute('style', `width: ${widthValue}px; ${style}`);
          }
        }
      });
      serialized = serializeDocument(html, fixDoc);
    }

    return serialized;
  },
};
