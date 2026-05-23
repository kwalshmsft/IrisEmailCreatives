export const RESPONSIVE_VISIBILITY_STYLE_ID = 'responsive-visibility-css';
export const VISIBILITY_OVERLAY_STYLE_ID = 'visibility-overlay-css';

export const RESPONSIVE_VISIBILITY_CSS = [
  '.mobile-only { display: none !important; max-height: 0; overflow: hidden; mso-hide: all; }',
  '.desktop-only { display: block !important; }',
  '@media only screen and (max-width: 480px) {',
  '  .mobile-only { display: block !important; max-height: none !important; overflow: visible !important; }',
  '  .desktop-only { display: none !important; max-height: 0 !important; overflow: hidden !important; }',
  '}',
].join('\n');

interface VisibilityAnalysis {
  desktopOnly: Set<string>;
  mobileOnly: Set<string>;
}

const removeBadges = (doc: Document) => {
  doc.querySelectorAll('[data-visibility-badge]').forEach((badge) => badge.remove());
  doc.querySelectorAll('[data-vis-mobile], [data-vis-desktop]').forEach((element) => {
    element.removeAttribute('data-vis-mobile');
    element.removeAttribute('data-vis-desktop');
  });
};

const findNearestVisibilityWrapper = (node: Node | null, doc: Document, className?: string): HTMLElement | null => {
  let current: HTMLElement | null = node instanceof HTMLElement ? node : node?.parentElement ?? null;
  while (current && current !== doc.body) {
    if (className) {
      if (current.classList.contains(className)) {
        return current;
      }
    } else if (current.classList.contains('mobile-only') || current.classList.contains('desktop-only')) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
};

const extractMediaBlocks = (cssText: string) => {
  const blocks: string[] = [];
  const regex = /@media[^{}]*max-width\s*:\s*(\d+)\s*px[^{}]*\{/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(cssText)) !== null) {
    const maxWidth = Number(match[1]);
    if (maxWidth > 768) {
      continue;
    }

    const start = match.index + match[0].length;
    let depth = 1;
    let end = start;
    for (let index = start; index < cssText.length && depth > 0; index += 1) {
      if (cssText[index] === '{') {
        depth += 1;
      }
      if (cssText[index] === '}') {
        depth -= 1;
      }
      end = index;
    }
    blocks.push(cssText.slice(start, end));
  }

  return blocks;
};

export const editorVisibilityService = {
  ensureResponsiveCss(doc: Document) {
    if (doc.getElementById(RESPONSIVE_VISIBILITY_STYLE_ID)) {
      return;
    }

    const styleTag = doc.createElement('style');
    styleTag.id = RESPONSIVE_VISIBILITY_STYLE_ID;
    // Include the responsive CSS but override hidden elements to stay visible
    // in the editor (they'll be hidden in actual email clients via media queries)
    // Use body prefix for higher specificity to beat template and media query styles
    styleTag.textContent = RESPONSIVE_VISIBILITY_CSS + '\n' +
      'body div.mobile-only, body div.desktop-only { display: block !important; max-height: none !important; overflow: visible !important; opacity: 1 !important; }\n' +
      'body span.mobile-only, body span.desktop-only { display: inline !important; max-height: none !important; overflow: visible !important; opacity: 1 !important; }\n' +
      'a[style*="text-decoration"] { text-decoration: inherit !important; }';
    (doc.head || doc.documentElement).appendChild(styleTag);
  },

  analyzeVisibility(doc: Document): VisibilityAnalysis {
    const desktopOnly = new Set<string>(['desktop-only']);
    const mobileOnly = new Set<string>(['mobile-only']);

    Array.from(doc.querySelectorAll('style')).forEach((styleTag) => {
      const cssText = styleTag.textContent || '';
      const mediaBlocks = extractMediaBlocks(cssText);

      mediaBlocks.forEach((block) => {
        const hideRules = Array.from(block.matchAll(/\.([a-zA-Z0-9_-]+)[^{]*\{[^}]*display\s*:\s*none[^}]*\}/gi));
        hideRules.forEach((match) => {
          desktopOnly.add(match[1]);
        });
      });

      const withoutMedia = cssText.replace(/@media[^{}]*\{(?:[^{}]|\{[^{}]*\})*\}/gis, ' ');
      const defaultHideRules = Array.from(withoutMedia.matchAll(/\.([a-zA-Z0-9_-]+)[^{]*\{[^}]*display\s*:\s*none[^}]*\}/gi));
      defaultHideRules.forEach((match) => {
        const className = match[1];
        const showsOnMobile = mediaBlocks.some((block) => new RegExp(`\\.${className}[^{]*\\{[^}]*display\\s*:\\s*block`, 'i').test(block));
        if (showsOnMobile) {
          mobileOnly.add(className);
        }
      });
    });

    return { desktopOnly, mobileOnly };
  },

  cleanupEditorArtifacts(doc: Document) {
    const overlayStyle = doc.getElementById(VISIBILITY_OVERLAY_STYLE_ID);
    if (overlayStyle) {
      overlayStyle.remove();
    }
    const responsiveStyle = doc.getElementById(RESPONSIVE_VISIBILITY_STYLE_ID);
    if (responsiveStyle) {
      responsiveStyle.remove();
    }
    removeBadges(doc);
  },

  stripEditorArtifacts(html: string) {
    if (!html.trim()) {
      return html;
    }

    const hasDoctype = /<!doctype/i.test(html);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    this.cleanupEditorArtifacts(doc);
    return `${hasDoctype ? '<!DOCTYPE html>' : ''}${doc.documentElement.outerHTML}`;
  },

  wrapSelection(doc: Document, range: Range | null, className: 'mobile-only' | 'desktop-only') {
    if (!range) {
      return false;
    }

    this.ensureResponsiveCss(doc);

    // Verify range is still valid in this document
    try {
      if (!doc.contains(range.startContainer) || !doc.contains(range.endContainer)) {
        return false;
      }
    } catch {
      return false;
    }

    const existingWrapper = findNearestVisibilityWrapper(range.commonAncestorContainer, doc, className);
    if (existingWrapper?.parentNode) {
      while (existingWrapper.firstChild) {
        existingWrapper.parentNode.insertBefore(existingWrapper.firstChild, existingWrapper);
      }
      existingWrapper.remove();
      if (doc.getElementById(VISIBILITY_OVERLAY_STYLE_ID)) {
        this.toggleOverlay(doc, true);
      }
      return true;
    }

    if (range.collapsed) {
      return false;
    }

    const wrapper = doc.createElement('div');
    wrapper.className = className;

    try {
      range.surroundContents(wrapper);
    } catch {
      // surroundContents fails when selection crosses element boundaries
      // Use a safer approach: clone contents, clear range, insert wrapper
      try {
        const fragment = range.cloneContents();
        wrapper.appendChild(fragment);
        range.deleteContents();
        range.insertNode(wrapper);
      } catch {
        return false;
      }
    }

    if (doc.getElementById(VISIBILITY_OVERLAY_STYLE_ID)) {
      this.toggleOverlay(doc, true);
    }

    return true;
  },

  toggleOverlay(doc: Document, show: boolean) {
    const existing = doc.getElementById(VISIBILITY_OVERLAY_STYLE_ID);
    if (existing) {
      existing.remove();
    }
    removeBadges(doc);

    if (!show) {
      return;
    }

    const visibility = this.analyzeVisibility(doc);
    const styleTag = doc.createElement('style');
    styleTag.id = VISIBILITY_OVERLAY_STYLE_ID;
    styleTag.textContent = [
      '[data-vis-mobile] { outline: 1px dashed #0078d4 !important; outline-offset: 1px; position: relative; }',
      '[data-vis-desktop] { outline: 1px dashed #605e5c !important; outline-offset: 1px; position: relative; }',
      '[data-visibility-badge] { position: absolute; top: -1px; left: -1px; z-index: 1; display: inline-block; padding: 1px 4px; border-radius: 0 0 3px 0; font-size: 9px; font-family: Segoe UI, sans-serif; color: #ffffff; opacity: 0.85; pointer-events: none; }',
      '[data-vis-mobile] > [data-visibility-badge] { background: #0078d4; }',
      '[data-vis-desktop] > [data-visibility-badge] { background: #605e5c; }',
      '[data-vis-mobile] { display: block !important; max-height: none !important; overflow: visible !important; opacity: 0.78; }',
    ].join('\n');
    (doc.head || doc.documentElement).appendChild(styleTag);

    Array.from(doc.querySelectorAll('*')).forEach((element) => {
      const className = typeof element.className === 'string' ? element.className : '';
      if (!className) {
        return;
      }

      const classes = className.split(/\s+/);
      const isMobileOnly = classes.some((value) => visibility.mobileOnly.has(value));
      const isDesktopOnly = classes.some((value) => visibility.desktopOnly.has(value));

      if (!isMobileOnly && !isDesktopOnly) {
        return;
      }

      const badge = doc.createElement('span');
      badge.setAttribute('data-visibility-badge', '');
      badge.textContent = isMobileOnly ? 'mobile' : 'desktop';

      if (isMobileOnly) {
        element.setAttribute('data-vis-mobile', '');
      }
      if (isDesktopOnly) {
        element.setAttribute('data-vis-desktop', '');
      }

      element.insertBefore(badge, element.firstChild);
    });
  },
};
