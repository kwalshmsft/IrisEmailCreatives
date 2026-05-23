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
    | 'outlook-flex-grid'
    | 'word-bloat-styles'
    | 'invalid-valign-span'
    | 'empty-elements'
    | 'outdated-meta'
    | 'invalid-width-attr'
    | 'deprecated-font-tags'
    | 'office-xml-elements'
    | 'missing-alt-attribute'
    | 'script-form-iframe'
    | 'missing-charset'
    | 'links-without-protocol'
    | 'unsupported-css-position'
    | 'external-stylesheets'
    | 'relative-local-images'
    | 'file-size-warning';
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
            fixDetail: 'Add max-width:100% and height:auto so the image shrinks on smaller screens without stretching larger.',
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

    // Word bloat: mso-* styles on elements
    let msoBloatCount = 0;
    Array.from(doc.querySelectorAll('*')).forEach((el) => {
      const style = el.getAttribute('style') || '';
      if (/mso-[\w-]+\s*:/i.test(style)) {
        msoBloatCount++;
      }
    });
    if (msoBloatCount > 5) {
      issues.push({
        id: nextId(),
        type: 'word-bloat-styles',
        detail: `${msoBloatCount} element(s) have Word/Office-specific styles (mso-* properties).`,
        element: 'multiple',
        fix: 'Strip Word bloat from inline styles.',
        fixDetail: 'Removes all mso-* properties and hyphens:none from inline styles, reducing file size significantly.',
      });
    }

    // Invalid valign attribute on non-table-cell elements
    let invalidValignCount = 0;
    Array.from(doc.querySelectorAll('*[valign]')).forEach((el) => {
      const tag = el.tagName.toLowerCase();
      if (tag !== 'td' && tag !== 'th' && tag !== 'tr') {
        invalidValignCount++;
      }
    });
    if (invalidValignCount > 0) {
      issues.push({
        id: nextId(),
        type: 'invalid-valign-span',
        detail: `${invalidValignCount} element(s) have invalid valign attribute (only valid on table cells).`,
        element: 'multiple',
        fix: 'Remove invalid valign attributes.',
        fixDetail: 'Removes valign from span, p, a, img, and other non-table elements.',
      });
    }

    // Empty elements (p/div with no meaningful content)
    let emptyCount = 0;
    Array.from(doc.querySelectorAll('p, div')).forEach((el) => {
      const text = el.textContent?.trim() || '';
      const hasChildren = el.children.length > 0;
      const style = el.getAttribute('style') || '';
      const hasLayoutStyle = /(?:height|padding|margin|line-height)\s*:\s*[^0;]/i.test(style);
      if (!text && !hasChildren && !el.id && !el.className && !hasLayoutStyle) {
        emptyCount++;
      }
    });
    if (emptyCount > 0) {
      issues.push({
        id: nextId(),
        type: 'empty-elements',
        detail: `${emptyCount} empty element(s) with no content, id, class, or layout styles.`,
        element: 'multiple',
        fix: 'Remove empty elements.',
        fixDetail: 'Removes p/div elements that contain no text, no children, and no meaningful styling.',
      });
    }

    // Outdated IE compatibility meta
    if (doc.querySelector('meta[http-equiv="X-UA-Compatible"]')) {
      issues.push({
        id: nextId(),
        type: 'outdated-meta',
        detail: 'Outdated <meta http-equiv="X-UA-Compatible"> tag found.',
        element: 'head',
        fix: 'Remove outdated meta tag.',
        fixDetail: 'Removes the IE compatibility mode tag which is no longer needed.',
      });
    }

    // Width attributes with "px" suffix (invalid — should be numeric)
    let invalidWidthCount = 0;
    Array.from(doc.querySelectorAll('*[width]')).forEach((el) => {
      const w = el.getAttribute('width') || '';
      if (/^\d+px$/i.test(w)) {
        invalidWidthCount++;
      }
    });
    if (invalidWidthCount > 0) {
      issues.push({
        id: nextId(),
        type: 'invalid-width-attr',
        detail: `${invalidWidthCount} element(s) have width attribute with "px" suffix (should be numeric).`,
        element: 'multiple',
        fix: 'Fix width attributes.',
        fixDetail: 'Strips "px" suffix from width attributes (e.g., width="643px" → width="643").',
      });
    }

    // Deprecated <font> tags
    const fontTags = doc.querySelectorAll('font');
    if (fontTags.length > 0) {
      issues.push({
        id: nextId(),
        type: 'deprecated-font-tags',
        detail: `${fontTags.length} deprecated <font> tag(s) found.`,
        element: 'multiple',
        fix: 'Convert to <span> with inline styles.',
        fixDetail: 'Replaces <font face/color/size> with <span style="font-family/color/font-size">.',
      });
    }

    // Office XML namespace elements (<o:p>, Word XML wrappers)
    const officeXmlRegex = /<o:p[^>]*>[\s\S]*?<\/o:p>/gi;
    const officeMatches = html.match(officeXmlRegex);
    if (officeMatches && officeMatches.length > 0) {
      issues.push({
        id: nextId(),
        type: 'office-xml-elements',
        detail: `${officeMatches.length} Office XML element(s) found (<o:p> wrappers).`,
        element: 'multiple',
        fix: 'Remove Office XML wrappers.',
        fixDetail: 'Strips <o:p> tags while preserving their text content. VML elements inside MSO conditionals are preserved.',
      });
    }

    // Missing alt attribute on images
    const imagesNoAlt = Array.from(doc.querySelectorAll('img')).filter((img) => !img.hasAttribute('alt'));
    if (imagesNoAlt.length > 0) {
      issues.push({
        id: nextId(),
        type: 'missing-alt-attribute',
        detail: `${imagesNoAlt.length} image(s) missing alt attribute.`,
        element: 'multiple',
        fix: 'Add empty alt attributes for accessibility.',
        fixDetail: 'Adds alt="" to images without an alt attribute. Some email clients show alt text when images are blocked.',
      });
    }

    // Script, form, iframe, object, embed elements (always stripped by email clients)
    const unsafeEls = doc.querySelectorAll('script, iframe, object, embed, form');
    if (unsafeEls.length > 0) {
      const tagNames = Array.from(new Set(Array.from(unsafeEls).map((el) => el.tagName.toLowerCase())));
      issues.push({
        id: nextId(),
        type: 'script-form-iframe',
        detail: `${unsafeEls.length} unsupported element(s) found: ${tagNames.join(', ')}.`,
        element: 'multiple',
        fix: 'Remove unsupported elements.',
        fixDetail: 'Removes script/iframe/object/embed entirely. Form wrappers are unwrapped (children preserved).',
      });
    }

    // Missing charset
    const hasCharset =
      doc.querySelector('meta[charset]') ||
      Array.from(doc.querySelectorAll('meta[http-equiv]')).some(
        (m) => /content-type/i.test(m.getAttribute('http-equiv') || '') && /charset/i.test(m.getAttribute('content') || '')
      );
    if (!hasCharset) {
      issues.push({
        id: nextId(),
        type: 'missing-charset',
        detail: 'No charset declaration found.',
        element: 'head',
        fix: 'Add UTF-8 charset meta tag.',
        fixDetail: 'Adds <meta charset="utf-8"> for proper character encoding across all email clients.',
      });
    }

    // Links without protocol (href="www.example.com")
    let brokenLinkCount = 0;
    Array.from(doc.querySelectorAll('a[href]')).forEach((a) => {
      const href = a.getAttribute('href') || '';
      if (/^www\./i.test(href)) {
        brokenLinkCount++;
      }
    });
    if (brokenLinkCount > 0) {
      issues.push({
        id: nextId(),
        type: 'links-without-protocol',
        detail: `${brokenLinkCount} link(s) missing protocol (href starts with "www.").`,
        element: 'multiple',
        fix: 'Add https:// protocol.',
        fixDetail: 'Prepends https:// to href values starting with "www." so links work in all email clients.',
      });
    }

    // Unsupported CSS position (absolute/fixed/sticky)
    let positionCount = 0;
    Array.from(doc.querySelectorAll('*')).forEach((el) => {
      const style = el.getAttribute('style') || '';
      if (/position\s*:\s*(absolute|fixed|sticky)/i.test(style)) {
        positionCount++;
      }
    });
    if (positionCount > 0) {
      issues.push({
        id: nextId(),
        type: 'unsupported-css-position',
        detail: `${positionCount} element(s) use position:absolute/fixed/sticky (unsupported in most email clients).`,
        element: 'multiple',
        fix: 'Remove unsupported positioning.',
        fixDetail: 'Strips position, top, right, bottom, left, and z-index from elements using absolute/fixed/sticky positioning.',
      });
    }

    // External stylesheets (<link rel="stylesheet">, @import)
    const externalLinks = doc.querySelectorAll('link[rel="stylesheet"]');
    const importCount = Array.from(doc.querySelectorAll('style')).filter((s) =>
      /@import\s/i.test(s.textContent || '')
    ).length;
    if (externalLinks.length > 0 || importCount > 0) {
      issues.push({
        id: nextId(),
        type: 'external-stylesheets',
        detail: `${externalLinks.length + importCount} external stylesheet reference(s) found (link/import).`,
        element: 'head',
        fix: 'Remove external stylesheet references.',
        fixDetail: 'Removes <link rel="stylesheet"> tags and @import rules. Most email clients block external CSS.',
      });
    }

    // Relative or local image sources
    let relativeImageCount = 0;
    Array.from(doc.querySelectorAll('img[src]')).forEach((img) => {
      const src = img.getAttribute('src') || '';
      if (/^(\/[^/]|file:\/\/|blob:|\.\/|\.\.\/)/.test(src)) {
        relativeImageCount++;
      }
    });
    if (relativeImageCount > 0) {
      issues.push({
        id: nextId(),
        type: 'relative-local-images',
        detail: `${relativeImageCount} image(s) with relative or local file paths (won't display in email).`,
        element: 'multiple',
        fix: 'Flag for manual review.',
        fixDetail: 'Images with relative paths, file:// or blob: URLs will not display in email. Replace with hosted https:// URLs.',
      });
    }

    // File size warning (Gmail clips at ~102KB)
    if (html.length > 80000) {
      issues.push({
        id: nextId(),
        type: 'file-size-warning',
        detail: `HTML is ${Math.round(html.length / 1024)}KB. Gmail clips emails larger than ~102KB.`,
        element: 'html',
        fix: 'Reduce file size.',
        fixDetail: 'Consider removing redundant styles, unused code, and Office bloat. Applying other fixes may reduce size sufficiently.',
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
        if (!width || width <= 200) {
          return;
        }

        image.removeAttribute('width');
        image.removeAttribute('height');
        const declarations = styleText
          .split(';')
          .map((part) => part.trim())
          .filter(Boolean)
          .filter((part) => !/^width\s*:/i.test(part) && !/^max-width\s*:/i.test(part) && !/^height\s*:/i.test(part) && !/^display\s*:/i.test(part));
        declarations.unshift('display: block');
        declarations.unshift('height: auto');
        declarations.unshift('max-width: 100%');
        // Large images (>=480px) are hero/banner — make fluid so they fill and shrink with container
        if (width >= 480) {
          declarations.unshift('width: 100%');
          image.classList.add('responsive-image-fluid');
        }
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

      // Fix ALL td/th cells: remove fixed widths, min-widths, and white-space:nowrap
      // Add stacking class only to cells in multi-column rows (not spacers/single-cell rows)
      Array.from(doc.querySelectorAll('td, th')).forEach((cell) => {
        const widthAttr = parsePixelWidth(cell.getAttribute('width'));
        const styleText = cell.getAttribute('style') || '';
        const styleWidth = parsePixelWidth(styleText.match(/width\s*:\s*([^;]+)/i)?.[1]);
        const minWidth = parsePixelWidth(styleText.match(/min-width\s*:\s*([^;]+)/i)?.[1]);
        const width = widthAttr ?? styleWidth;

        // Remove width attribute
        if (widthAttr && widthAttr > 100) {
          cell.removeAttribute('width');
        }

        // Determine if this cell should stack on mobile (multi-column row with significant width)
        const row = cell.parentElement;
        const siblingCells = row ? Array.from(row.children).filter((c) => c.tagName === 'TD' || c.tagName === 'TH') : [];
        if (siblingCells.length > 1 && (width === null || width > 50)) {
          cell.classList.add('responsive-stack');
        }

        // Clean up inline styles that cause overflow
        if ((width && width > 100) || minWidth || /white-space\s*:\s*nowrap/i.test(styleText)) {
          const declarations = styleText
            .split(';')
            .map((part) => part.trim())
            .filter(Boolean)
            .filter((part) =>
              !/^width\s*:/i.test(part) &&
              !/^min-width\s*:/i.test(part) &&
              !/^max-width\s*:/i.test(part) &&
              !/^white-space\s*:\s*nowrap/i.test(part)
            );
          if (width && width > 480) {
            declarations.unshift(`max-width: ${width}px`);
            declarations.unshift('width: 100%');
          } else if (width && width > 100) {
            // Preserve moderate widths as inline style so layout survives
            // Gmail stripping <style> blocks. Media query overrides on mobile.
            declarations.unshift(`width: ${width}px`);
          }
          cell.setAttribute('style', `${Array.from(new Set(declarations)).join('; ')};`);
        }
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
          '.responsive-image { max-width: 100% !important; height: auto !important; display: block; }',
          '.responsive-image-fluid { width: 100% !important; }',
          'table.responsive-table { width: 100% !important; }',
          '@media only screen and (max-width: 480px) {',
          '  table.responsive-table {',
          '    width: 100% !important;',
          '    max-width: 100% !important;',
          '  }',
          '  .responsive-stack {',
          '    display: block !important;',
          '    width: 100% !important;',
          '    max-width: 100% !important;',
          '    direction: ltr !important;',
          '  }',
          '  img {',
          '    max-width: 100% !important;',
          '  }',
          '  img.responsive-image {',
          '    height: auto !important;',
          '  }',
          '  img.responsive-image-fluid {',
          '    width: 100% !important;',
          '  }',
          '}',
        ].join('\n')
      );
    }

    let serialized = serializeDocument(html, doc);

    // Rewrite fixed pixel widths in <style> blocks to also include max-width:100%
    // Skip the responsive-fix-css block we just added, and only match "width:" not preceded by "max-"
    if (shouldApply('fixed-width-table') || shouldApply('fixed-width-cell')) {
      serialized = serialized.replace(/(<style(?![^>]*id="responsive-fix-css")[^>]*>)([\s\S]*?)(<\/style>)/gi, (match, open, css, close) => {
        // Only match property declarations inside rule bodies (not @media conditions)
        // Replace "width: Npx" where N>200 and not preceded by "max-" or inside @media(...)
        const fixed = css.replace(/(?<!max-)(?<!-)width\s*:\s*(\d+)px/gi, (wMatch: string, px: string) => {
          if (parseInt(px) > 200) {
            return `${wMatch}; max-width: 100%`;
          }
          return wMatch;
        });
        return `${open}${fixed}${close}`;
      });
    }

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

    // Word bloat cleanup: strip mso-* properties and other Word-only styles from inline styles
    if (shouldApply('word-bloat-styles')) {
      const bloatDoc = createDocument(serialized);
      Array.from(bloatDoc.querySelectorAll('*')).forEach((el) => {
        const style = el.getAttribute('style');
        if (!style) return;
        const cleaned = style
          .split(';')
          .map((p) => p.trim())
          .filter((p) => !/^mso-[\w-]+\s*:/i.test(p) && !/^hyphens\s*:\s*none/i.test(p))
          .filter(Boolean)
          .join('; ');
        if (cleaned) {
          el.setAttribute('style', cleaned);
        } else {
          el.removeAttribute('style');
        }
      });
      serialized = serializeDocument(html, bloatDoc);
    }

    // Remove invalid valign from non-table elements
    if (shouldApply('invalid-valign-span')) {
      const valignDoc = createDocument(serialized);
      Array.from(valignDoc.querySelectorAll('*[valign]')).forEach((el) => {
        const tag = el.tagName.toLowerCase();
        if (tag !== 'td' && tag !== 'th' && tag !== 'tr') {
          el.removeAttribute('valign');
        }
      });
      serialized = serializeDocument(html, valignDoc);
    }

    // Remove truly empty elements (no content, no id, no class, no layout styles)
    if (shouldApply('empty-elements')) {
      const emptyDoc = createDocument(serialized);
      Array.from(emptyDoc.querySelectorAll('p, div')).forEach((el) => {
        const text = el.textContent?.trim() || '';
        const hasChildren = el.children.length > 0;
        const style = el.getAttribute('style') || '';
        const hasLayoutStyle = /(?:height|padding|margin|line-height)\s*:\s*[^0;]/i.test(style);
        if (!text && !hasChildren && !el.id && !el.className && !hasLayoutStyle) {
          el.remove();
        }
      });
      serialized = serializeDocument(html, emptyDoc);
    }

    // Remove outdated IE meta tag
    if (shouldApply('outdated-meta')) {
      const metaDoc = createDocument(serialized);
      const ieMeta = metaDoc.querySelector('meta[http-equiv="X-UA-Compatible"]');
      if (ieMeta) ieMeta.remove();
      serialized = serializeDocument(html, metaDoc);
    }

    // Fix width attributes with "px" suffix
    if (shouldApply('invalid-width-attr')) {
      const widthDoc = createDocument(serialized);
      Array.from(widthDoc.querySelectorAll('*[width]')).forEach((el) => {
        const w = el.getAttribute('width') || '';
        if (/^\d+px$/i.test(w)) {
          el.setAttribute('width', w.replace(/px$/i, ''));
        }
      });
      serialized = serializeDocument(html, widthDoc);
    }

    // Convert deprecated <font> tags to <span> with inline styles
    if (shouldApply('deprecated-font-tags')) {
      const fontSizeMap: Record<string, string> = { '1': '10px', '2': '13px', '3': '16px', '4': '18px', '5': '24px', '6': '32px', '7': '48px' };
      const fontDoc = createDocument(serialized);
      Array.from(fontDoc.querySelectorAll('font')).forEach((font) => {
        const span = fontDoc.createElement('span');
        const styles: string[] = [];
        const face = font.getAttribute('face');
        const color = font.getAttribute('color');
        const size = font.getAttribute('size');
        if (face) styles.push(`font-family: ${face}`);
        if (color) styles.push(`color: ${color}`);
        if (size) {
          const mapped = fontSizeMap[size] || fontSizeMap[String(Math.min(7, Math.max(1, parseInt(size) || 3)))];
          if (mapped) styles.push(`font-size: ${mapped}`);
        }
        if (styles.length > 0) span.setAttribute('style', styles.join('; '));
        // Preserve existing attributes like class/id
        const existingStyle = font.getAttribute('style');
        if (existingStyle) {
          const combined = styles.length > 0 ? `${styles.join('; ')}; ${existingStyle}` : existingStyle;
          span.setAttribute('style', combined);
        }
        while (font.firstChild) span.appendChild(font.firstChild);
        font.parentNode?.replaceChild(span, font);
      });
      serialized = serializeDocument(html, fontDoc);
    }

    // Remove Office XML elements (<o:p> wrappers) — preserve text content, preserve VML in MSO conditionals
    if (shouldApply('office-xml-elements')) {
      // Only strip <o:p> tags (safe) — VML (v:*) is preserved as it may be intentional Outlook fallback
      serialized = serialized.replace(/<o:p[^>]*>([\s\S]*?)<\/o:p>/gi, '$1');
      // Also strip empty <o:p /> self-closing
      serialized = serialized.replace(/<o:p[^>]*\/>/gi, '');
      // Remove xmlns:o, xmlns:w, xmlns:v namespace declarations from the html tag (bloat)
      serialized = serialized.replace(/\s+xmlns:(o|w|m|dt)="[^"]*"/gi, '');
    }

    // Add alt="" to images without alt attribute
    if (shouldApply('missing-alt-attribute')) {
      const altDoc = createDocument(serialized);
      Array.from(altDoc.querySelectorAll('img')).forEach((img) => {
        if (!img.hasAttribute('alt')) {
          img.setAttribute('alt', '');
        }
      });
      serialized = serializeDocument(html, altDoc);
    }

    // Remove script/iframe/object/embed; unwrap form (preserve children)
    if (shouldApply('script-form-iframe')) {
      const unsafeDoc = createDocument(serialized);
      // Remove dangerous elements entirely
      Array.from(unsafeDoc.querySelectorAll('script, iframe, object, embed')).forEach((el) => el.remove());
      // Unwrap forms — preserve their visible children
      Array.from(unsafeDoc.querySelectorAll('form')).forEach((form) => {
        while (form.firstChild) form.parentNode?.insertBefore(form.firstChild, form);
        form.remove();
      });
      // Remove input/textarea/select (email clients can't render them)
      Array.from(unsafeDoc.querySelectorAll('input, textarea, select')).forEach((el) => el.remove());
      serialized = serializeDocument(html, unsafeDoc);
    }

    // Add charset meta tag
    if (shouldApply('missing-charset')) {
      const charsetDoc = createDocument(serialized);
      const hasExistingCharset =
        charsetDoc.querySelector('meta[charset]') ||
        Array.from(charsetDoc.querySelectorAll('meta[http-equiv]')).some(
          (m) => /content-type/i.test(m.getAttribute('http-equiv') || '') && /charset/i.test(m.getAttribute('content') || '')
        );
      if (!hasExistingCharset) {
        const meta = charsetDoc.createElement('meta');
        meta.setAttribute('charset', 'utf-8');
        const head = ensureHead(charsetDoc);
        head.insertBefore(meta, head.firstChild);
        serialized = serializeDocument(html, charsetDoc);
      }
    }

    // Fix links without protocol
    if (shouldApply('links-without-protocol')) {
      const linkDoc = createDocument(serialized);
      Array.from(linkDoc.querySelectorAll('a[href]')).forEach((a) => {
        const href = a.getAttribute('href') || '';
        if (/^www\./i.test(href)) {
          a.setAttribute('href', `https://${href}`);
        }
      });
      serialized = serializeDocument(html, linkDoc);
    }

    // Remove unsupported CSS positioning (absolute/fixed/sticky) and related props
    if (shouldApply('unsupported-css-position')) {
      const posDoc = createDocument(serialized);
      Array.from(posDoc.querySelectorAll('*')).forEach((el) => {
        const style = el.getAttribute('style');
        if (!style) return;
        if (!/position\s*:\s*(absolute|fixed|sticky)/i.test(style)) return;
        const cleaned = style
          .split(';')
          .map((p) => p.trim())
          .filter(Boolean)
          .filter((p) => !/^(position|top|right|bottom|left|z-index)\s*:/i.test(p))
          .join('; ');
        if (cleaned) {
          el.setAttribute('style', cleaned);
        } else {
          el.removeAttribute('style');
        }
      });
      serialized = serializeDocument(html, posDoc);
    }

    // Remove external stylesheets and @import rules
    if (shouldApply('external-stylesheets')) {
      const cssDoc = createDocument(serialized);
      Array.from(cssDoc.querySelectorAll('link[rel="stylesheet"]')).forEach((el) => el.remove());
      Array.from(cssDoc.querySelectorAll('style')).forEach((styleEl) => {
        const text = styleEl.textContent || '';
        if (/@import\s/i.test(text)) {
          styleEl.textContent = text.replace(/@import\s+[^;]+;?/gi, '').trim();
          if (!styleEl.textContent.trim()) styleEl.remove();
        }
      });
      serialized = serializeDocument(html, cssDoc);
    }

    return serialized;
  },
};
