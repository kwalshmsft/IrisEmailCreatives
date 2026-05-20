import React from 'react';
import { EditorToolbar } from './EditorToolbar';
import { ImageEditor } from './ImageEditor';
import { LinkEditor } from './LinkEditor';
import { ContentGalleryEntry, galleryDbService } from '../../services/galleryDbService';
import { editorVisibilityService } from '../../services/editorVisibilityService';
import { EmailClient, EMAIL_CLIENTS, EMAIL_CLIENT_NOTICES, emailClientSimulatorService } from '../../services/emailClientSimulatorService';
import { ResponsiveIssue, responsiveAnalyzerService } from '../../services/responsiveAnalyzerService';
import { GlobeRegular, EditRegular, SaveRegular, DeleteRegular, LockClosedRegular, LockOpenRegular, CheckmarkCircleRegular, PhoneLaptopRegular, ImageAddRegular, ArrowUploadRegular } from '@fluentui/react-icons';
import { Combobox, Option } from '@fluentui/react-components';
import ConfirmationDialog from '../../components/ConfirmationDialog/ConfirmationDialog';
import { isRtlLocale, transformForPublish } from '../../services/rtlService';

const LOCALE_OPTIONS = [
  'en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'pt-BR',
  'ja-JP', 'ko-KR', 'zh-CN', 'zh-TW', 'ar-SA', 'he-IL', 'ru-RU',
  'nl-NL', 'pl-PL', 'tr-TR', 'th-TH', 'cs-CZ', 'da-DK', 'fi-FI',
  'hu-HU', 'nb-NO', 'sv-SE',
];

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title></title>
</head>
<body>

</body>
</html>`;

type EditorTab = 'visual' | 'html';
type PreviewWidth = 0 | 768 | 375;

interface SavedLocation {
  productName: string;
  fileName: string;
}

interface ImageEditorState {
  isOpen: boolean;
  index: number;
  src: string;
  alt: string;
  linkHref: string;
  linkAlias: string;
  width?: number;
  height?: number;
}

interface LinkEditorState {
  isOpen: boolean;
  index: number;
  href: string;
  alias: string;
  text: string;
  mode: 'create' | 'edit';
}

interface ResponsiveIssueState extends ResponsiveIssue {
  accepted: boolean | null;
}

const pageStyles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    fontFamily: 'Segoe UI, sans-serif',
    fontSize: 14,
  },
  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 600,
  },
  subtitle: {
    margin: 0,
    color: '#605e5c',
    lineHeight: 1.5,
  },
  card: {
    borderRadius: 4,
    boxShadow: '0 1.6px 3.6px 0 rgba(0,0,0,0.132), 0 0.3px 0.9px 0 rgba(0,0,0,0.108)',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  cardHeader: {
    padding: '10px 16px',
    fontWeight: 600,
    color: '#323130',
    fontSize: 16,
    margin: 0,
    backgroundColor: '#dce6f0',
  },
  cardBody: {
    padding: 16,
    backgroundColor: '#ffffff',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 4,
    border: '1px solid #8a8886',
    fontSize: 14,
    boxSizing: 'border-box',
    fontFamily: 'Segoe UI, sans-serif',
  },
  textarea: {
    width: '100%',
    minHeight: 420,
    border: '1px solid #8a8886',
    borderRadius: 4,
    padding: 12,
    fontFamily: 'Consolas, monospace',
    fontSize: 13,
    boxSizing: 'border-box',
  },
  buttonRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  button: {
    borderRadius: 4,
    padding: '8px 12px',
    border: '1px solid #c8c6c4',
    backgroundColor: '#ffffff',
    color: '#323130',
    cursor: 'pointer',
    fontSize: 14,
  },
  primaryButton: {
    borderRadius: 4,
    padding: '8px 12px',
    border: '1px solid #0078d4',
    backgroundColor: '#0078d4',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: 14,
  },
  successButton: {
    borderRadius: 4,
    padding: '8px 12px',
    border: '1px solid #107c10',
    backgroundColor: '#107c10',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: 14,
  },
  tabButton: {
    borderRadius: 4,
    padding: '8px 12px',
    border: '1px solid #8a8886',
    backgroundColor: '#ffffff',
    color: '#323130',
    cursor: 'pointer',
    fontSize: 14,
  },
  tabButtonActive: {
    borderRadius: 4,
    padding: '8px 12px',
    border: '1px solid #0078d4',
    backgroundColor: '#eff6fc',
    color: '#005a9e',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  },
  indicatorBar: {
    padding: '10px 16px',
    backgroundColor: '#f3f2f1',
    borderRadius: 4,
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  muted: {
    color: '#605e5c',
  },
  issueCard: {
    border: '1px solid #edebe9',
    borderRadius: 4,
    padding: 12,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  previewShell: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 4,
    overflowX: 'auto',
  },
};

const decodeHtml = (value: string) => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
};

const encodeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const createBlankHtml = (title = '') => updateTitle(DEFAULT_HTML, title);

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>(.*?)<\/title>/is);
  return match ? decodeHtml(match[1].trim()) : '';
}

function updateTitle(html: string, newTitle: string) {
  const encodedTitle = encodeHtml(newTitle);
  const source = html.trim() ? html : DEFAULT_HTML;

  if (/<title[^>]*>.*?<\/title>/is.test(source)) {
    return source.replace(/(<title[^>]*>)(.*?)(<\/title>)/is, `$1${encodedTitle}$3`);
  }

  if (/<head[^>]*>/i.test(source)) {
    return source.replace(/<head([^>]*)>/i, `<head$1><title>${encodedTitle}</title>`);
  }

  if (/<html[^>]*>/i.test(source)) {
    return source.replace(/<html([^>]*)>/i, `<html$1><head><title>${encodedTitle}</title></head>`);
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${encodedTitle}</title></head><body>${source}</body></html>`;
}

function ensurePreviewBaseTarget(html: string) {
  if (!html.trim()) {
    return html;
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const head = doc.head || doc.documentElement.appendChild(doc.createElement('head'));
  let base = head.querySelector('base[target]');
  if (!base) {
    base = doc.createElement('base');
    head.prepend(base);
  }
  base.setAttribute('target', '_blank');
  return `${/<!doctype/i.test(html) ? '<!DOCTYPE html>' : ''}${doc.documentElement.outerHTML}`;
}

const formatClockTime = (value: Date) =>
  new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(value);

const extractHtmlLocale = (html: string): string | null => {
  const match = html.match(/<html[^>]*\slang=["']([^"']+)["']/i);
  return match ? match[1] : null;
};

// Module-level cache to survive StrictMode double-mount
let _pendingOpenEntry: ContentGalleryEntry | undefined;

export const Create: React.FC = () => {
  // HashRouter doesn't support route state — read entry from sessionStorage
  const [initialEntry] = React.useState<ContentGalleryEntry | undefined>(() => {
    if (_pendingOpenEntry) {
      const entry = _pendingOpenEntry;
      return entry;
    }
    const raw = sessionStorage.getItem('emailEditor:openEntry');
    if (raw) {
      sessionStorage.removeItem('emailEditor:openEntry');
      try {
        const entry = JSON.parse(raw) as ContentGalleryEntry;
        _pendingOpenEntry = entry;
        return entry;
      } catch { return undefined; }
    }
    return undefined;
  });
  const initialHtml = initialEntry?.htmlContent ? updateTitle(initialEntry.htmlContent, extractTitle(initialEntry.htmlContent)) : createBlankHtml('');

  // Clear module cache after stable mount
  React.useEffect(() => {
    _pendingOpenEntry = undefined;
  }, []);

  const iframeRef = React.useRef<HTMLIFrameElement | null>(null);
  const responsiveResultsRef = React.useRef<HTMLDivElement | null>(null);
  const savedRangeRef = React.useRef<Range | null>(null);
  const visualSyncTimeoutRef = React.useRef<number | null>(null);
  const uploadHtmlInputRef = React.useRef<HTMLInputElement | null>(null);
  const suppressSyncRef = React.useRef(false);
  const htmlFromVisualRef = React.useRef(false);
  const savePromptTimeoutRef = React.useRef<number | null>(null);
  const autoSaveIntervalRef = React.useRef<number | null>(null);
  const lastWrittenToEditorRef = React.useRef('');
  const activeTabRef = React.useRef<EditorTab>('visual');
  const htmlContentRef = React.useRef(initialHtml);
  const subjectLineRef = React.useRef(initialEntry ? extractTitle(initialEntry.htmlContent) : '');
  const savedLocationRef = React.useRef<SavedLocation | null>(initialEntry ? { productName: initialEntry.productName, fileName: initialEntry.fileName } : null);

  const [activeTab, setActiveTab] = React.useState<EditorTab>('visual');
  const [htmlContent, setHtmlContent] = React.useState(initialHtml);
  const [subjectLine, setSubjectLine] = React.useState(initialEntry ? extractTitle(initialEntry.htmlContent) : '');
  const [previewWidth, setPreviewWidth] = React.useState<PreviewWidth>(0);
  const [previewClient, setPreviewClient] = React.useState<EmailClient>('standard');
  const [showVisibility, setShowVisibility] = React.useState(false);
  const [responsiveIssues, setResponsiveIssues] = React.useState<ResponsiveIssueState[] | null>(null);
  const [isAnalyzingResponsive, setIsAnalyzingResponsive] = React.useState(false);
  const [savedLocation, setSavedLocation] = React.useState<SavedLocation | null>(initialEntry ? { productName: initialEntry.productName, fileName: initialEntry.fileName } : null);
  const [lastAutoSave, setLastAutoSave] = React.useState<Date | null>(null);
  const [showSavePrompt, setShowSavePrompt] = React.useState(false);
  const [savePromptDismissed, setSavePromptDismissed] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(false);
  const [showUploadHtmlOption, setShowUploadHtmlOption] = React.useState(!initialEntry);
  const [isPublished, setIsPublished] = React.useState(!!initialEntry?.published);
  const [currentLocale, setCurrentLocale] = React.useState<string | null>(initialEntry?.locale || extractHtmlLocale(initialEntry?.htmlContent || '') || navigator.language || 'en-US');
  const [localeInput, setLocaleInput] = React.useState('');
  const [editingLocale, setEditingLocale] = React.useState(false);
  const [confirmDialog, setConfirmDialog] = React.useState<{ type: 'publish' | 'unpublish' | 'clear'; title: string; subText: string } | null>(null);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [htmlIsResponsive, setHtmlIsResponsive] = React.useState(false);
  const [imageEditor, setImageEditor] = React.useState<ImageEditorState>({
    isOpen: false,
    index: -1,
    src: '',
    alt: '',
    linkHref: '',
    linkAlias: '',
  });
  const [linkEditor, setLinkEditor] = React.useState<LinkEditorState>({
    isOpen: false,
    index: -1,
    href: '',
    alias: '',
    text: '',
    mode: 'create',
  });

  React.useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  React.useEffect(() => {
    htmlContentRef.current = htmlContent;
  }, [htmlContent]);

  React.useEffect(() => {
    subjectLineRef.current = subjectLine;
  }, [subjectLine]);

  React.useEffect(() => {
    savedLocationRef.current = savedLocation;
  }, [savedLocation]);

  React.useEffect(
    () => () => {
      if (visualSyncTimeoutRef.current !== null) {
        window.clearTimeout(visualSyncTimeoutRef.current);
      }
      if (savePromptTimeoutRef.current !== null) {
        window.clearTimeout(savePromptTimeoutRef.current);
      }
      if (autoSaveIntervalRef.current !== null) {
        window.clearInterval(autoSaveIntervalRef.current);
      }
    },
    []
  );

  // Load default template on mount (only when no entry was passed from gallery)
  React.useEffect(() => {
    if (initialEntry) return; // Already have content from gallery
    let cancelled = false;
    (async () => {
      try {
        const htmlRes = await fetch('/templates/CopilotNewsletter_en-US.html');
        if (cancelled) return;
        if (htmlRes.ok) {
          const html = await htmlRes.text();
          if (!cancelled) {
            htmlFromVisualRef.current = false;
            setHtmlContent(html);
            setSubjectLine(extractTitle(html));
            const extracted = extractHtmlLocale(html);
            setCurrentLocale(extracted && extracted !== 'und' ? extracted : navigator.language || 'en-US');
          }
        }
      } catch {
        // Silently fall back to blank template
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearSavePromptTimer = () => {
    if (savePromptTimeoutRef.current !== null) {
      window.clearTimeout(savePromptTimeoutRef.current);
      savePromptTimeoutRef.current = null;
    }
  };

  const startSavePromptTimer = () => {
    if (savedLocationRef.current || savePromptDismissed || savePromptTimeoutRef.current !== null) {
      return;
    }

    savePromptTimeoutRef.current = window.setTimeout(() => {
      setShowSavePrompt(true);
      savePromptTimeoutRef.current = null;
    }, 60000);
  };

  const markDirty = () => {
    setIsDirty(true);
    setShowUploadHtmlOption(false);
    startSavePromptTimer();
  };

  const getVisualDocument = () => iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document || null;

  const saveSelection = () => {
    const doc = getVisualDocument();
    const selection = doc?.defaultView?.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedRangeRef.current = selection.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    const doc = getVisualDocument();
    const win = iframeRef.current?.contentWindow;
    if (!doc || !win) {
      return null;
    }

    const selection = win.getSelection();
    if (!selection) {
      return null;
    }

    win.focus();
    selection.removeAllRanges();
    if (savedRangeRef.current) {
      selection.addRange(savedRangeRef.current);
      return { doc, selection, range: savedRangeRef.current };
    }

    if (selection.rangeCount > 0) {
      return { doc, selection, range: selection.getRangeAt(0) };
    }

    return { doc, selection, range: null as Range | null };
  };

  const dispatchEditorInput = (doc: Document) => {
    doc.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const syncHtmlFromVisual = () => {
    const doc = getVisualDocument();
    if (!doc) {
      return updateTitle(htmlContentRef.current || DEFAULT_HTML, subjectLineRef.current);
    }

    const serialized = editorVisibilityService.stripEditorArtifacts(
      `${doc.doctype ? '<!DOCTYPE html>' : ''}${doc.documentElement.outerHTML}`
    );
    htmlFromVisualRef.current = true;
    setHtmlContent(serialized);
    setHtmlIsResponsive(false);

    const nextSubject = extractTitle(serialized);
    if (nextSubject !== subjectLineRef.current) {
      setSubjectLine(nextSubject);
    }

    // Store what the write-back effect would compute so it doesn't rewrite the iframe
    lastWrittenToEditorRef.current = updateTitle(serialized, nextSubject || subjectLineRef.current);

    return serialized;
  };

  const scheduleVisualSync = () => {
    if (suppressSyncRef.current) return;
    if (visualSyncTimeoutRef.current !== null) {
      window.clearTimeout(visualSyncTimeoutRef.current);
    }

    visualSyncTimeoutRef.current = window.setTimeout(() => {
      syncHtmlFromVisual();
      visualSyncTimeoutRef.current = null;
    }, 200);
  };

  const updateVisualDocumentTitle = (nextTitle: string) => {
    const doc = getVisualDocument();
    if (!doc) {
      return;
    }

    if (!doc.head) {
      const head = doc.createElement('head');
      doc.documentElement.insertBefore(head, doc.body || doc.documentElement.firstChild);
    }

    let titleElement = doc.head.querySelector('title');
    if (!titleElement) {
      titleElement = doc.createElement('title');
      doc.head.appendChild(titleElement);
    }
    titleElement.textContent = nextTitle;
  };

  const clickTimerRef = React.useRef<number | null>(null);

  const attachEditorHandlers = (doc: Document) => {
    doc.addEventListener('selectionchange', () => saveSelection());
    doc.addEventListener('input', () => {
      markDirty();
      scheduleVisualSync();
    });
    // Double-click selects element with visible highlight for visibility wrapping
    doc.addEventListener('dblclick', (event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      // Cancel pending single-click editor open
      if (clickTimerRef.current !== null) {
        window.clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }

      if (target.tagName === 'IMG' || target.closest('a')) {
        event.preventDefault();
        const el = (target.tagName === 'IMG' ? target : target.closest('a')!) as HTMLElement;
        const range = doc.createRange();
        range.selectNode(el);
        const sel = doc.defaultView?.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
        el.style.outline = '3px solid #0078d4';
        el.style.outlineOffset = '2px';
        const clearOutline = () => {
          el.style.outline = '';
          el.style.outlineOffset = '';
          doc.removeEventListener('click', clearOutline);
          doc.removeEventListener('keydown', clearOutline);
        };
        setTimeout(() => {
          doc.addEventListener('click', clearOutline, { once: true });
          doc.addEventListener('keydown', clearOutline, { once: true });
        }, 0);
      }
    });
    // Single-click opens editors after a delay (cancelled if double-click follows)
    doc.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (target.tagName === 'IMG') {
        event.preventDefault();
        const imgEl = target as HTMLImageElement;
        const images = Array.from(doc.querySelectorAll('img'));
        const index = images.indexOf(imgEl);
        const parentLink = target.closest('a');
        if (clickTimerRef.current !== null) {
          window.clearTimeout(clickTimerRef.current);
        }
        clickTimerRef.current = window.setTimeout(() => {
          clickTimerRef.current = null;
          setImageEditor({
            isOpen: true,
            index,
            src: imgEl.getAttribute('src') || '',
            alt: imgEl.getAttribute('alt') || '',
            linkHref: parentLink?.getAttribute('href') || '',
            linkAlias: parentLink?.getAttribute('alias') || '',
            width: imgEl.naturalWidth || imgEl.width || undefined,
            height: imgEl.naturalHeight || imgEl.height || undefined,
          });
        }, 300);
        return;
      }

      const link = target.closest('a');
      if (link) {
        event.preventDefault();
        const links = Array.from(doc.querySelectorAll('a'));
        const index = links.indexOf(link);
        if (clickTimerRef.current !== null) {
          window.clearTimeout(clickTimerRef.current);
        }
        clickTimerRef.current = window.setTimeout(() => {
          clickTimerRef.current = null;
          setLinkEditor({
            isOpen: true,
            index,
            href: link.getAttribute('href') || '',
            alias: link.getAttribute('alias') || '',
            text: link.textContent || '',
            mode: 'edit',
          });
        }, 300);
      }
    });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (activeTab !== 'visual') {
      return;
    }

    // If this state change originated from the visual editor, the iframe
    // already has the correct DOM — don't rewrite it.
    if (htmlFromVisualRef.current) {
      return;
    }

    const writeToIframe = () => {
      const doc = getVisualDocument();
      if (!doc) {
        setTimeout(writeToIframe, 50);
        return;
      }

      const nextHtml = updateTitle(htmlContent || DEFAULT_HTML, subjectLine);
      if (lastWrittenToEditorRef.current === nextHtml) {
        return;
      }

      doc.open();
      doc.write(nextHtml);
      doc.close();
      try {
        doc.designMode = 'on';
      } catch (error) {
        // Ignore designMode errors for unsupported documents.
      }

      editorVisibilityService.ensureResponsiveCss(doc);
      attachEditorHandlers(doc);
      lastWrittenToEditorRef.current = nextHtml;
      if (showVisibility) {
        editorVisibilityService.toggleOverlay(doc, true);
      }
      // Apply RTL direction based on locale
      if (doc.documentElement && currentLocale) {
        doc.documentElement.setAttribute('dir', isRtlLocale(currentLocale) ? 'rtl' : 'ltr');
      }
    };

    writeToIframe();
  }, [activeTab, htmlContent, subjectLine]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (activeTab !== 'visual') {
      return;
    }

    const doc = getVisualDocument();
    if (!doc) {
      return;
    }

    editorVisibilityService.toggleOverlay(doc, showVisibility);
  }, [activeTab, showVisibility]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (autoSaveIntervalRef.current !== null) {
      window.clearInterval(autoSaveIntervalRef.current);
      autoSaveIntervalRef.current = null;
    }

    if (!savedLocation || isPublished) {
      return;
    }

    autoSaveIntervalRef.current = window.setInterval(() => {
      const target = savedLocationRef.current;
      if (!target) {
        return;
      }

      const htmlToSave = activeTabRef.current === 'visual' ? syncHtmlFromVisual() : updateTitle(htmlContentRef.current, subjectLineRef.current);

      void (async () => {
        const existing = await galleryDbService.getEntry(target.productName, target.fileName);
        const entry: ContentGalleryEntry = {
          productName: target.productName,
          fileName: target.fileName,
          htmlContent: htmlToSave,
          sourceType: 'html',
          lastModifiedUtc: new Date().toISOString(),
          locale: existing?.locale,
          published: existing?.published,
          publishedAtUtc: existing?.publishedAtUtc,
        };

        await galleryDbService.saveEntry(entry);
        setLastAutoSave(new Date(entry.lastModifiedUtc));
        setIsDirty(false);

      })();
    }, 180000);

    return () => {
      if (autoSaveIntervalRef.current !== null) {
        window.clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
    };
  }, [savedLocation, isPublished]); // eslint-disable-line react-hooks/exhaustive-deps

  const getCurrentHtmlForPersistence = () => {
    const latestHtml = activeTabRef.current === 'visual' ? syncHtmlFromVisual() : htmlContentRef.current || DEFAULT_HTML;
    return updateTitle(latestHtml || DEFAULT_HTML, subjectLineRef.current);
  };

  const saveNow = async () => {
    const location = savedLocationRef.current;
    if (!location) {
      return;
    }

    let html = getCurrentHtmlForPersistence();
    // Embed locale in HTML if set
    if (currentLocale) {
      const existingLang = extractHtmlLocale(html);
      if (existingLang !== currentLocale) {
        if (/<html[^>]*\slang=["'][^"']*["']/i.test(html)) {
          html = html.replace(/(<html[^>]*\slang=["'])[^"']*(["'])/i, `$1${currentLocale}$2`);
        } else {
          html = html.replace(/<html([^>]*)>/i, `<html$1 lang="${currentLocale}">`);
        }
      }
    }

    const entry: ContentGalleryEntry = {
      productName: location.productName,
      fileName: location.fileName,
      htmlContent: html,
      sourceType: 'html',
      lastModifiedUtc: new Date().toISOString(),
      locale: currentLocale || undefined,
      published: isPublished || undefined,
      publishedAtUtc: isPublished ? (await galleryDbService.getEntry(location.productName, location.fileName))?.publishedAtUtc : undefined,
    };

    await galleryDbService.saveEntry(entry);
    setLastAutoSave(new Date(entry.lastModifiedUtc));
    setIsDirty(false);
  };

  const switchTab = (nextTab: EditorTab) => {
    if (nextTab === activeTab) {
      return;
    }

    if (activeTabRef.current === 'visual') {
      syncHtmlFromVisual();
    }

    // When switching TO visual, the iframe will be freshly mounted (blank).
    // Reset lastWrittenToEditorRef so the write-back effect always populates it.
    // Also clear htmlFromVisualRef so the effect doesn't skip writing.
    if (nextTab === 'visual') {
      lastWrittenToEditorRef.current = '';
      htmlFromVisualRef.current = false;
    }

    setActiveTab(nextTab);
  };

  const clearAll = () => {
    htmlFromVisualRef.current = false;
    setHtmlContent(createBlankHtml(''));
    setSubjectLine('');
    setPreviewWidth(0);
    setResponsiveIssues(null);
    setSavedLocation(null);
    setLastAutoSave(null);
    setCurrentLocale(navigator.language || 'en-US');
    setIsPublished(false);
    setShowSavePrompt(false);
    setSavePromptDismissed(false);
    setIsDirty(false);
    setHtmlIsResponsive(false);
    clearSavePromptTimer();
    lastWrittenToEditorRef.current = '';
  };

  const handlePublish = async () => {
    const location = savedLocationRef.current;
    if (!location) return;

    if (!currentLocale) {
      showToast('Set a locale before publishing');
      return;
    }

    setConfirmDialog({
      type: 'publish',
      title: 'Publish content',
      subText: `Publish "${location.productName} / ${location.fileName}"? This will lock the file from further editing until unpublished.`,
    });
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const confirmPublish = async () => {
    setConfirmDialog(null);
    const location = savedLocationRef.current;
    if (!location) return;

    const existing = await galleryDbService.getEntry(location.productName, location.fileName);
    if (!existing) return;

    const updated: ContentGalleryEntry = {
      ...existing,
      published: true,
      publishedAtUtc: new Date().toISOString(),
      publishedHtml: transformForPublish(existing.htmlContent),
    };

    await galleryDbService.saveEntry(updated);
    setIsPublished(true);
    lastWrittenToEditorRef.current = '';
    htmlFromVisualRef.current = false;
    showToast('Published successfully');
  };

  const handleUnpublish = async () => {
    const location = savedLocationRef.current;
    if (!location) return;

    setConfirmDialog({
      type: 'unpublish',
      title: 'Unpublish content',
      subText: 'Unpublishing this content will remove it from the Localize tab. If localization has already begun, the source content may go out of sync with ICMS.\n\nAre you sure you want to unpublish?',
    });
  };

  const confirmUnpublish = async () => {
    setConfirmDialog(null);
    const location = savedLocationRef.current;
    if (!location) return;

    const existing = await galleryDbService.getEntry(location.productName, location.fileName);
    if (!existing) return;

    const updated: ContentGalleryEntry = {
      ...existing,
      published: false,
      publishedAtUtc: undefined,
    };

    await galleryDbService.saveEntry(updated);
    setIsPublished(false);
    showToast('Unpublished');
  };

  // Upload Image stub — will integrate with blob storage service
  const handleUploadImage = () => {
    // TODO: Open a file picker, upload to blob storage, and return the URL
    const url = window.prompt('Upload Image\n\nThis feature will upload an image to blob storage and return a URL.\n\nFor now, paste an image URL:');
    if (url) {
      void navigator.clipboard.writeText(url);
      showToast('Image URL copied to clipboard');
    }
  };

  const handleUploadHtmlFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    const html = await file.text();
    suppressSyncRef.current = true;
    htmlFromVisualRef.current = false;
    setHtmlContent(html);
    setSubjectLine(extractTitle(html));
    setCurrentLocale(extractHtmlLocale(html) || currentLocale);
    setShowUploadHtmlOption(false);
    lastWrittenToEditorRef.current = '';
    markDirty();
    setTimeout(() => { suppressSyncRef.current = false; }, 500);
  };

  // Save dialog state
  const [showSaveDialog, setShowSaveDialog] = React.useState(false);
  const [saveDialogProduct, setSaveDialogProduct] = React.useState('');
  const [saveDialogSubfolder, setSaveDialogSubfolder] = React.useState('');
  const [saveDialogFileName, setSaveDialogFileName] = React.useState('');
  const [saveDialogMode, setSaveDialogMode] = React.useState<'save' | 'saveAs'>('save');
  const [existingProducts, setExistingProducts] = React.useState<string[]>([]);
  const [existingSubfolders, setExistingSubfolders] = React.useState<string[]>([]);

  const loadExistingFolders = async () => {
    const allEntries = await galleryDbService.getAllEntries();
    const products = Array.from(new Set(allEntries.map(e => {
      const parts = e.productName.split('/');
      return parts[0];
    }))).filter(p => p && p !== 'UploadsFromLocalization' && p !== 'UploadsFromGallery').sort();
    setExistingProducts(products);
  };

  const loadSubfoldersForProduct = (product: string) => {
    galleryDbService.getAllEntries().then(allEntries => {
      const subs = Array.from(new Set(allEntries
        .filter(e => e.productName.startsWith(product + '/'))
        .map(e => e.productName.slice(product.length + 1))
      )).sort();
      setExistingSubfolders(subs);
    });
  };

  const sanitizePath = (value: string) => value.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-_.]/g, '');

  const openSaveDialog = () => {
    const current = savedLocationRef.current;
    if (current?.productName) {
      const parts = current.productName.split('/');
      setSaveDialogProduct(parts[0]);
      setSaveDialogSubfolder(parts.slice(1).join('/'));
    } else {
      setSaveDialogProduct('');
      setSaveDialogSubfolder('');
    }
    setSaveDialogFileName(current?.fileName || '');
    setSaveDialogMode('save');
    setShowSaveDialog(true);
    void loadExistingFolders();
    if (current?.productName) {
      loadSubfoldersForProduct(current.productName.split('/')[0]);
    }
  };

  const openSaveAsDialog = () => {
    const current = savedLocationRef.current;
    if (current?.productName) {
      const parts = current.productName.split('/');
      setSaveDialogProduct(parts[0]);
      setSaveDialogSubfolder(parts.slice(1).join('/'));
    } else {
      setSaveDialogProduct('');
      setSaveDialogSubfolder('');
    }
    setSaveDialogFileName('');
    setSaveDialogMode('saveAs');
    setShowSaveDialog(true);
    void loadExistingFolders();
    if (current?.productName) {
      loadSubfoldersForProduct(current.productName.split('/')[0]);
    }
  };

  const handleSaveDialogConfirm = async () => {
    const product = sanitizePath(saveDialogProduct.trim());
    const subfolder = sanitizePath(saveDialogSubfolder.trim());
    const fileName = sanitizePath(saveDialogFileName.trim());
    if (!product || !fileName) return;

    const productName = subfolder ? `${product}/${subfolder}` : product;

    const entry: ContentGalleryEntry = {
      productName,
      fileName,
      htmlContent: getCurrentHtmlForPersistence(),
      sourceType: 'html',
      lastModifiedUtc: new Date().toISOString(),
      updatedBy: 'kwal@microsoft.com',
      locale: currentLocale || undefined,
      published: isPublished,
      publishedAtUtc: isPublished ? new Date().toISOString() : undefined,
      publishedHtml: isPublished ? getCurrentHtmlForPersistence() : undefined,
    };
    await galleryDbService.saveEntry(entry);
    setSavedLocation({ productName, fileName });
    setLastAutoSave(new Date(entry.lastModifiedUtc));
    setIsDirty(false);
    setShowSaveDialog(false);
    showToast('Saved');
  };


  const handleOpenEntry = (entry: ContentGalleryEntry) => {
    // Cancel any pending visual-sync so stale iframe content doesn't overwrite the new HTML
    if (visualSyncTimeoutRef.current !== null) {
      window.clearTimeout(visualSyncTimeoutRef.current);
      visualSyncTimeoutRef.current = null;
    }
    // Suppress syncs from iframe events triggered by the upcoming doc.write()
    suppressSyncRef.current = true;
    const nextHtml = updateTitle(entry.htmlContent || DEFAULT_HTML, extractTitle(entry.htmlContent || DEFAULT_HTML));
    htmlFromVisualRef.current = false;
    setHtmlContent(nextHtml);
    setSubjectLine(extractTitle(nextHtml));
    setResponsiveIssues(null);
    setSavedLocation({ productName: entry.productName, fileName: entry.fileName });
    setLastAutoSave(new Date(entry.lastModifiedUtc));
    setCurrentLocale(entry.locale || extractHtmlLocale(entry.htmlContent) || null);
    setIsPublished(!!entry.published);
    setShowSavePrompt(false);
    setSavePromptDismissed(false);
    clearSavePromptTimer();
    setIsDirty(false);
    setShowUploadHtmlOption(false);
    lastWrittenToEditorRef.current = '';
    setTimeout(() => { suppressSyncRef.current = false; }, 500);
  };

  const analyzeResponsiveness = () => {
    if (!htmlContent.trim()) {
      return;
    }

    if (htmlIsResponsive) {
      setResponsiveIssues([]);
      setTimeout(() => responsiveResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
      return;
    }

    setIsAnalyzingResponsive(true);
    const result = responsiveAnalyzerService.analyze(htmlContent);
    setResponsiveIssues(result.issues.map((issue) => ({ ...issue, accepted: null })));
    setIsAnalyzingResponsive(false);
    setTimeout(() => responsiveResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
  };

  const applyAcceptedFixes = () => {
    if (!responsiveIssues) {
      return;
    }

    const acceptedTypes = responsiveIssues.filter((issue) => issue.accepted === true).map((issue) => issue.type);
    if (acceptedTypes.length === 0) {
      return;
    }

    const nextHtml = responsiveAnalyzerService.injectResponsiveCss(htmlContent, acceptedTypes);
    htmlFromVisualRef.current = false;
    setHtmlContent(updateTitle(nextHtml, subjectLineRef.current));
    setResponsiveIssues(null);
    setHtmlIsResponsive(true);
    markDirty();
  };

  const getSelectedText = () => savedRangeRef.current?.toString() || '';

  const execEditorCommand = (command: string, value?: string) => {
    const context = restoreSelection();
    if (!context?.range) {
      return;
    }

    suppressSyncRef.current = true;

    if (command === 'fontSize' && (value === 'increase' || value === 'decrease')) {
      const currentSize = Number(context.doc.queryCommandValue('fontSize')) || 3;
      const nextSize = value === 'increase'
        ? Math.min(currentSize + 1, 7)
        : Math.max(currentSize - 1, 1);
      context.doc.execCommand('fontSize', false, String(nextSize));
    } else {
      context.doc.execCommand(command, false, value);
    }

    saveSelection();
    syncHtmlFromVisual();
    setTimeout(() => { suppressSyncRef.current = false; }, 500);
    setHtmlIsResponsive(false);
  };

  const applyColor = (command: 'foreColor' | 'hiliteColor', value: string) => {
    const context = restoreSelection();
    if (!context?.range) {
      return;
    }

    const ok = context.doc.execCommand(command, false, value);
    if (!ok && !context.range.collapsed) {
      const span = context.doc.createElement('span');
      if (command === 'foreColor') {
        span.style.color = value;
      } else {
        span.style.backgroundColor = value;
      }
      try {
        context.range.surroundContents(span);
      } catch (error) {
        const fragment = context.range.extractContents();
        span.appendChild(fragment);
        context.range.insertNode(span);
      }
    }

    saveSelection();
    dispatchEditorInput(context.doc);
    setHtmlIsResponsive(false);
  };

  const clearHighlight = () => {
    const context = restoreSelection();
    if (!context?.range) {
      return;
    }

    context.doc.execCommand('hiliteColor', false, 'transparent');
    saveSelection();
    dispatchEditorInput(context.doc);
    setHtmlIsResponsive(false);
  };

  const insertText = (text: string) => {
    const context = restoreSelection();
    if (!context?.range) {
      return;
    }

    context.range.deleteContents();
    const textNode = context.doc.createTextNode(text);
    context.range.insertNode(textNode);
    context.range.setStartAfter(textNode);
    context.range.setEndAfter(textNode);
    context.selection.removeAllRanges();
    context.selection.addRange(context.range);
    savedRangeRef.current = context.range.cloneRange();
    dispatchEditorInput(context.doc);
    setHtmlIsResponsive(false);
  };

  const wrapVisibility = (className: 'mobile-only' | 'desktop-only') => {
    const doc = getVisualDocument();
    const win = iframeRef.current?.contentWindow;
    if (!doc || !win) { return; }

    win.focus();
    editorVisibilityService.ensureResponsiveCss(doc);

    // Clear any selection outline left by double-click highlight
    doc.querySelectorAll('[style*="outline"]').forEach((el) => {
      (el as HTMLElement).style.outline = '';
      (el as HTMLElement).style.outlineOffset = '';
    });

    // Always use the saved range (saved on selectionchange/mousedown)
    const range = savedRangeRef.current;
    if (!range) { return; }

    // Verify range belongs to this document
    try {
      if (!doc.contains(range.startContainer)) { return; }
    } catch { return; }

    // Restore selection in iframe
    const sel = win.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }

    // Check if cursor is inside an existing wrapper with this class — unwrap
    let node: Node | null = range.commonAncestorContainer;
    if (node.nodeType === 3) node = node.parentElement;
    let existing: HTMLElement | null = null;
    let check = node as HTMLElement | null;
    while (check && check !== doc.body) {
      if (check.classList?.contains(className)) {
        existing = check;
        break;
      }
      check = check.parentElement;
    }

    if (existing && existing.parentNode) {
      suppressSyncRef.current = true;
      while (existing.firstChild) {
        existing.parentNode.insertBefore(existing.firstChild, existing);
      }
      existing.remove();
      syncHtmlFromVisual();
      markDirty();
      if (showVisibility) {
        editorVisibilityService.toggleOverlay(doc, true);
      }
      setTimeout(() => { suppressSyncRef.current = false; }, 500);
      return;
    }

    // If selection is collapsed, check if we're on an image and select it
    if (range.collapsed) {
      let targetEl = range.startContainer as HTMLElement;
      if (targetEl.nodeType === 3) targetEl = targetEl.parentElement as HTMLElement;
      if (targetEl?.tagName === 'IMG') {
        range.selectNode(targetEl);
      } else {
        return;
      }
    }

    // Use span for inline text, div for block elements (images, etc.)
    const isBlockContent = range.cloneContents().querySelector('img, table, div, p, h1, h2, h3, h4, h5, h6');
    const wrapper = doc.createElement(isBlockContent ? 'div' : 'span');
    wrapper.className = className;

    suppressSyncRef.current = true;
    try {
      range.surroundContents(wrapper);
    } catch {
      const extracted = range.extractContents();
      wrapper.appendChild(extracted);
      range.insertNode(wrapper);
    }

    if (sel) sel.removeAllRanges();

    // Sync state from the modified DOM without triggering a rewrite
    syncHtmlFromVisual();
    markDirty();
    if (showVisibility) {
      editorVisibilityService.toggleOverlay(doc, true);
    }
    // Keep suppression active long enough to catch the async input event
    setTimeout(() => { suppressSyncRef.current = false; }, 500);
  };

  const applyImageChanges = () => {
    const doc = getVisualDocument();
    if (!doc) {
      setImageEditor((current) => ({ ...current, isOpen: false }));
      return;
    }

    if (imageEditor.index < 0) {
      // Insert new image at cursor
      if (!imageEditor.src.trim()) {
        setImageEditor((current) => ({ ...current, isOpen: false }));
        return;
      }
      const img = doc.createElement('img');
      img.setAttribute('src', imageEditor.src);
      if (imageEditor.alt.trim()) img.setAttribute('alt', imageEditor.alt);

      let nodeToInsert: HTMLElement = img;
      if (imageEditor.linkHref.trim()) {
        const anchor = doc.createElement('a');
        anchor.setAttribute('href', imageEditor.linkHref);
        if (imageEditor.linkAlias.trim()) anchor.setAttribute('alias', imageEditor.linkAlias.trim());
        anchor.appendChild(img);
        nodeToInsert = anchor;
      }

      // Insert at end of body
      doc.body.appendChild(nodeToInsert);
      dispatchEditorInput(doc);
      scheduleVisualSync();
      setImageEditor((current) => ({ ...current, isOpen: false }));
      setHtmlIsResponsive(false);
      return;
    }

    const images = Array.from(doc.querySelectorAll('img'));
    const image = images[imageEditor.index];
    if (image) {
      image.setAttribute('src', imageEditor.src);
      image.setAttribute('alt', imageEditor.alt);

      // Handle link wrapping
      const parentLink = image.closest('a');
      if (imageEditor.linkHref.trim()) {
        if (parentLink) {
          parentLink.setAttribute('href', imageEditor.linkHref);
          if (imageEditor.linkAlias.trim()) {
            parentLink.setAttribute('alias', imageEditor.linkAlias.trim());
          } else {
            parentLink.removeAttribute('alias');
          }
        } else {
          // Wrap image in a new anchor
          const anchor = doc.createElement('a');
          anchor.setAttribute('href', imageEditor.linkHref);
          if (imageEditor.linkAlias.trim()) {
            anchor.setAttribute('alias', imageEditor.linkAlias.trim());
          }
          image.parentNode?.insertBefore(anchor, image);
          anchor.appendChild(image);
        }
      } else if (parentLink) {
        // Remove the link wrapper
        parentLink.parentNode?.insertBefore(image, parentLink);
        parentLink.remove();
      }

      dispatchEditorInput(doc);
      scheduleVisualSync();
    }

    setImageEditor((current) => ({ ...current, isOpen: false }));
    setHtmlIsResponsive(false);
  };

  const applyLinkChanges = () => {
    const doc = getVisualDocument();
    if (!doc) {
      setLinkEditor((current) => ({ ...current, isOpen: false }));
      return;
    }

    if (linkEditor.mode === 'edit') {
      const links = Array.from(doc.querySelectorAll('a'));
      const link = links[linkEditor.index];
      if (link) {
        link.setAttribute('href', linkEditor.href);
        if (linkEditor.alias.trim()) {
          link.setAttribute('alias', linkEditor.alias.trim());
        } else {
          link.removeAttribute('alias');
        }
      }
    } else {
      const context = restoreSelection();
      if (context?.range && !context.range.collapsed) {
        const anchor = doc.createElement('a');
        anchor.setAttribute('href', linkEditor.href);
        if (linkEditor.alias.trim()) {
          anchor.setAttribute('alias', linkEditor.alias.trim());
        }
        try {
          context.range.surroundContents(anchor);
        } catch (error) {
          const fragment = context.range.extractContents();
          anchor.appendChild(fragment);
          context.range.insertNode(anchor);
        }
      }
    }

    dispatchEditorInput(doc);
    scheduleVisualSync();
    setLinkEditor((current) => ({ ...current, isOpen: false }));
    setHtmlIsResponsive(false);
  };

  const previewContent = React.useMemo(
    () => {
      let content = ensurePreviewBaseTarget(emailClientSimulatorService.simulate(htmlContent, previewClient));
      // Apply RTL direction for preview based on locale
      if (currentLocale && isRtlLocale(currentLocale)) {
        content = content.replace(/<html([^>]*)>/i, '<html$1 dir="rtl">');
      }
      return content;
    },
    [htmlContent, previewClient, currentLocale]
  );

  return (
    <div style={pageStyles.page}>
      {toastMessage ? (
        <div style={{
          position: 'fixed',
          top: 12,
          right: 12,
          zIndex: 2000,
          padding: '10px 20px',
          borderRadius: 4,
          backgroundColor: '#107c10',
          color: '#ffffff',
          fontSize: 14,
          fontWeight: 600,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          <CheckmarkCircleRegular style={{ marginRight: 6 }} />{toastMessage}
        </div>
      ) : null}
      <div style={pageStyles.indicatorBar}>
        <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          <span style={{ color: '#605e5c' }}>Working on: </span>
          <strong>
            {savedLocation ? `${savedLocation.productName} / ${savedLocation.fileName}` : 'Unsaved document'}
          </strong>
          <span style={{ marginLeft: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <GlobeRegular style={{ fontSize: 14, color: '#605e5c' }} />
            {editingLocale ? (
              <Combobox
                freeform
                autoComplete="on"
                value={localeInput}
                onOptionSelect={(_e, data) => {
                  const next = (data.optionValue || '').trim();
                  setLocaleInput(next);
                  if (next && next !== currentLocale) {
                    setCurrentLocale(next);
                    markDirty();
                  }
                }}
                onChange={(e) => {
                  setLocaleInput((e.target as HTMLInputElement).value);
                }}
                onBlur={() => {
                  const next = localeInput.trim();
                  if (next && next !== currentLocale) {
                    setCurrentLocale(next);
                    markDirty();
                  }
                  setEditingLocale(false);
                }}
                placeholder="Locale"
                style={{ width: 110, minWidth: 110 }}
                autoFocus
              >
                {LOCALE_OPTIONS.map((locale) => (
                  <Option key={locale} value={locale}>{locale}</Option>
                ))}
              </Combobox>
            ) : (
              <>
                <span style={{ fontSize: 12, color: '#323130' }}>{currentLocale || 'Not set'}</span>
                <button
                  type="button"
                  onClick={() => { setLocaleInput(currentLocale || ''); setEditingLocale(true); }}
                  style={{ background: 'none', border: 'none', color: '#0078d4', cursor: 'pointer', fontSize: 14, padding: 0, display: 'inline-flex' }}
                >
                  <EditRegular />
                </button>
              </>
            )}
          </span>
          {savedLocation && lastAutoSave ? (
            <span style={{ marginLeft: 12, color: '#605e5c', display: 'inline-flex', alignItems: 'center', gap: 4 }}><SaveRegular style={{ fontSize: 14 }} /> {formatClockTime(lastAutoSave)}</span>
          ) : null}
          {isDirty && !isPublished ? <span style={{ marginLeft: 12, color: '#a4262c' }}>Unsaved changes</span> : null}
          {isPublished ? (
            <span style={{ marginLeft: 12, color: '#107c10', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <LockClosedRegular style={{ fontSize: 14 }} /> Published
            </span>
          ) : null}
        </div>
        <div style={pageStyles.buttonRow}>
          {!savedLocation && !isPublished ? (
            <button type="button" style={pageStyles.primaryButton} onClick={openSaveDialog}>
              <SaveRegular style={{ marginRight: 4 }} /> Save
            </button>
          ) : null}
          {savedLocation && !isPublished ? (
            <button type="button" style={pageStyles.successButton} onClick={() => void saveNow()}>
              <SaveRegular style={{ marginRight: 4 }} /> Save
            </button>
          ) : null}
          {savedLocation && !isPublished ? (
            <button type="button" style={pageStyles.button} onClick={openSaveDialog}>
              Save As...
            </button>
          ) : null}
          {isPublished ? (
            <button type="button" style={pageStyles.primaryButton} onClick={openSaveAsDialog}>
              Save As...
            </button>
          ) : null}
          {savedLocation && !isPublished ? (
            <button type="button" style={{ ...pageStyles.button, borderColor: '#107c10', color: '#107c10' }} onClick={() => void handlePublish()}>
              <LockClosedRegular style={{ marginRight: 4 }} /> Publish
            </button>
          ) : null}
          {savedLocation && isPublished ? (
            <button type="button" style={{ ...pageStyles.button, borderColor: '#a4262c', color: '#a4262c' }} onClick={() => void handleUnpublish()}>
              <LockOpenRegular style={{ marginRight: 4 }} /> Unpublish
            </button>
          ) : null}
          <span style={{ borderLeft: '1px solid #c8c6c4', height: 24, margin: '0 4px' }} />
          <button type="button" style={{ ...pageStyles.button, color: '#a4262c', borderColor: '#a4262c' }} onClick={() => setConfirmDialog({ type: 'clear', title: 'Clear all content', subText: 'This will erase the editor, subject line, and reset the document. Any unsaved changes will be lost.' })}>
            <DeleteRegular style={{ marginRight: 4 }} /> Clear All
          </button>
        </div>
      </div>

      {showSavePrompt ? (
        <div
          style={{
            ...pageStyles.card,
            border: '1px solid #0078d4',
            padding: 16,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span><SaveRegular style={{ marginRight: 4 }} />You have unsaved work. Would you like to save?</span>
          <div style={pageStyles.buttonRow}>
            <button type="button" style={pageStyles.primaryButton} onClick={openSaveDialog}>
              Save
            </button>
            <button
              type="button"
              style={pageStyles.button}
              onClick={() => {
                setShowSavePrompt(false);
                setSavePromptDismissed(true);
                clearSavePromptTimer();
              }}
            >
              Not now
            </button>
          </div>
        </div>
      ) : null}

      <div style={pageStyles.card}>
        <div style={pageStyles.cardBody}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#605e5c', fontWeight: 600, whiteSpace: 'nowrap' }}>Subject:</label>
            <input
              value={subjectLine}
              placeholder="Email subject — auto-detected from <title> tag"
              style={{ ...pageStyles.input, flex: 1 }}
              onChange={(event) => {
                const nextValue = event.target.value;
                setSubjectLine(nextValue);
                const updatedHtml = updateTitle(getCurrentHtmlForPersistence(), nextValue);
                if (activeTabRef.current === 'visual') {
                  htmlFromVisualRef.current = true;
                } else {
                  htmlFromVisualRef.current = false;
                }
                setHtmlContent(updatedHtml);
                if (activeTabRef.current === 'visual') {
                  updateVisualDocumentTitle(nextValue);
                  lastWrittenToEditorRef.current = updatedHtml;
                }
                markDirty();
              }}
            />
          </div>
          <div style={{ ...pageStyles.buttonRow, marginBottom: 12, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {(['visual', 'html'] as EditorTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  style={activeTab === tab ? pageStyles.tabButtonActive : pageStyles.tabButton}
                  onClick={() => switchTab(tab)}
                >
                  {tab === 'visual' ? 'Visual Editor' : 'Raw HTML'}
                </button>
              ))}
              {showUploadHtmlOption && (
                <button
                  type="button"
                  style={{ ...pageStyles.button, color: '#0078d4', borderColor: '#0078d4', fontSize: 13, padding: '6px 10px', marginLeft: 8 }}
                  onClick={() => uploadHtmlInputRef.current?.click()}
                >
                  <ArrowUploadRegular style={{ marginRight: 4 }} /> Upload HTML
                </button>
              )}
            </div>
            <button type="button" style={{ ...pageStyles.button, color: '#0078d4', borderColor: '#0078d4', fontSize: 13, padding: '6px 10px' }} onClick={handleUploadImage}>
              <ImageAddRegular style={{ marginRight: 4 }} /> Upload Image
            </button>
          </div>
          <input
            ref={uploadHtmlInputRef}
            type="file"
            accept=".html,.htm"
            style={{ display: 'none' }}
            onChange={(e) => void handleUploadHtmlFile(e)}
          />

          {activeTab === 'visual' ? (
            <>
              <EditorToolbar
                onSaveSelection={saveSelection}
                onExec={execEditorCommand}
                onApplyColor={applyColor}
                onClearHighlight={clearHighlight}
                onInsertText={insertText}
                onOpenLinkEditor={() => {
                  saveSelection();
                  setLinkEditor({
                    isOpen: true,
                    index: -1,
                    href: '',
                    alias: '',
                    text: getSelectedText() || '(selected content)',
                    mode: 'create',
                  });
                }}
                onInsertImage={() => {
                  saveSelection();
                  setImageEditor({
                    isOpen: true,
                    index: -1,
                    src: '',
                    alt: '',
                    linkHref: '',
                    linkAlias: '',
                  });
                }}
                onWrapVisibility={wrapVisibility}
                onToggleVisibility={() => setShowVisibility((current) => !current)}
                showVisibility={showVisibility}
              />
              <iframe
                ref={iframeRef}
                title="Visual email editor"
                style={{ width: '100%', height: 600, border: '1px solid #8a8886', borderRadius: 4, backgroundColor: '#ffffff' }}
              />
            </>
          ) : null}

          {activeTab === 'html' ? (
            <>
              <textarea
                rows={24}
                value={htmlContent}
                style={pageStyles.textarea}
                onChange={(event) => {
                  const nextHtml = event.target.value;
                  htmlFromVisualRef.current = false;
                  setHtmlContent(nextHtml);
                  setSubjectLine(extractTitle(nextHtml));
                  setResponsiveIssues(null);
                  setHtmlIsResponsive(false);
                  markDirty();
                }}
              />
            </>
          ) : null}
        </div>
      </div>

      {htmlContent.trim() ? (
        <div style={pageStyles.card}>
          <div style={pageStyles.cardHeader}>Preview</div>
          <div style={pageStyles.cardBody}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12, alignItems: 'center' }}>
              <div>
                <button type="button" style={pageStyles.button} onClick={analyzeResponsiveness} title="Analyze email for responsive design issues">
                  <PhoneLaptopRegular style={{ marginRight: 4 }} />
                  {isAnalyzingResponsive ? 'Analyzing...' : 'Check Responsiveness'}
                </button>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#605e5c', fontWeight: 600 }}>Viewport:</span>
                  {([
                    { label: 'Desktop', value: 0 as PreviewWidth },
                    { label: 'Tablet', value: 768 as PreviewWidth },
                    { label: 'Mobile', value: 375 as PreviewWidth },
                  ]).map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      style={previewWidth === option.value ? pageStyles.tabButtonActive : pageStyles.tabButton}
                      onClick={() => {
                        setPreviewWidth(option.value);
                        if (previewClient === 'outlook-desktop' && option.value !== 0) setPreviewClient('standard');
                        if (previewClient === 'ios-mail' && option.value === 0) setPreviewClient('standard');
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#605e5c', fontWeight: 600 }}>Client:</span>
                  {EMAIL_CLIENTS.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      style={previewClient === client.id ? pageStyles.tabButtonActive : pageStyles.tabButton}
                      onClick={() => {
                        setPreviewClient(client.id);
                        if (client.id === 'outlook-desktop') setPreviewWidth(0);
                        else if (client.id === 'ios-mail') setPreviewWidth(375);
                      }}
                      title={client.description}
                    >
                      {client.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {EMAIL_CLIENT_NOTICES[previewClient] ? (
              <div style={{ padding: '8px 12px', marginBottom: 8, borderRadius: 4, backgroundColor: '#fff3cd', border: '1px solid #ffc107', fontSize: 12, color: '#856404' }}>
                {EMAIL_CLIENT_NOTICES[previewClient]}
              </div>
            ) : null}
            <div style={pageStyles.previewShell}>
              <div style={{ maxWidth: previewWidth || '100%', margin: '0 auto', backgroundColor: '#ffffff' }}>
                <iframe
                  title="Email preview"
                  srcDoc={previewContent}
                  style={{ width: '100%', height: 600, border: '1px solid #e1dfdd', backgroundColor: '#ffffff' }}
                />
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {responsiveIssues ? (
                <div ref={responsiveResultsRef}>
                {responsiveIssues.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ ...pageStyles.buttonRow, justifyContent: 'flex-end' }}>
                      {responsiveIssues.some((issue) => issue.accepted === true) ? (
                        <>
                          <button type="button" style={pageStyles.successButton} onClick={applyAcceptedFixes}>
                            Apply {responsiveIssues.filter((issue) => issue.accepted === true).length} fix(es)
                          </button>
                          <button
                            type="button"
                            style={pageStyles.button}
                            onClick={() => setResponsiveIssues((current) => current?.map((issue) => ({ ...issue, accepted: null })) || null)}
                          >
                            Reset
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            style={pageStyles.button}
                            onClick={() => setResponsiveIssues((current) => current?.map((issue) => ({ ...issue, accepted: true })) || null)}
                          >
                            Accept All
                          </button>
                          <button
                            type="button"
                            style={pageStyles.button}
                            onClick={() => setResponsiveIssues((current) => current?.map((issue) => ({ ...issue, accepted: false })) || null)}
                          >
                            Reject All
                          </button>
                        </>
                      )}
                    </div>
                    {responsiveIssues.map((issue) => (
                      <div
                        key={issue.id}
                        style={{
                          ...pageStyles.issueCard,
                          backgroundColor:
                            issue.accepted === true ? '#dff6dd' : issue.accepted === false ? '#f3f2f1' : '#ffffff',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>
                            <code>{issue.element}</code> — {issue.detail}
                          </div>
                          <div style={{ marginTop: 4 }}>
                            <strong>Fix:</strong> {issue.fix}
                          </div>
                          <div style={{ marginTop: 4, color: '#605e5c', fontFamily: 'Consolas, monospace', fontSize: 12 }}>
                            {issue.fixDetail}
                          </div>
                        </div>
                        <div style={pageStyles.buttonRow}>
                          <button
                            type="button"
                            style={issue.accepted === true ? pageStyles.successButton : pageStyles.button}
                            onClick={() =>
                              setResponsiveIssues((current) =>
                                current?.map((candidate) =>
                                  candidate.id === issue.id ? { ...candidate, accepted: candidate.accepted === true ? null : true } : candidate
                                ) || null
                              )
                            }
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            style={issue.accepted === false ? { ...pageStyles.button, borderColor: '#d13438', color: '#a4262c' } : pageStyles.button}
                            onClick={() =>
                              setResponsiveIssues((current) =>
                                current?.map((candidate) =>
                                  candidate.id === issue.id ? { ...candidate, accepted: candidate.accepted === false ? null : false } : candidate
                                ) || null
                              )
                            }
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: 12, borderRadius: 4, backgroundColor: '#dff6dd', color: '#0b6a0b', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckmarkCircleRegular /> No responsive issues detected.
                  </div>
                )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <ImageEditor
        isOpen={imageEditor.isOpen}
        src={imageEditor.src}
        alt={imageEditor.alt}
        linkHref={imageEditor.linkHref}
        linkAlias={imageEditor.linkAlias}
        width={imageEditor.width}
        height={imageEditor.height}
        onSrcChange={(value) => setImageEditor((current) => ({ ...current, src: value }))}
        onAltChange={(value) => setImageEditor((current) => ({ ...current, alt: value }))}
        onLinkHrefChange={(value) => setImageEditor((current) => ({ ...current, linkHref: value }))}
        onLinkAliasChange={(value) => setImageEditor((current) => ({ ...current, linkAlias: value }))}
        onApply={applyImageChanges}
        onClose={() => setImageEditor((current) => ({ ...current, isOpen: false }))}
      />

      <LinkEditor
        isOpen={linkEditor.isOpen}
        href={linkEditor.href}
        alias={linkEditor.alias}
        text={linkEditor.text}
        mode={linkEditor.mode}
        onHrefChange={(value) => setLinkEditor((current) => ({ ...current, href: value }))}
        onAliasChange={(value) => setLinkEditor((current) => ({ ...current, alias: value }))}
        onApply={applyLinkChanges}
        onClose={() => setLinkEditor((current) => ({ ...current, isOpen: false }))}
      />

      <ConfirmationDialog
        hidden={!confirmDialog}
        title={confirmDialog?.title || ''}
        subText={confirmDialog?.subText || ''}
        primaryButtonText={confirmDialog?.type === 'publish' ? 'Publish' : confirmDialog?.type === 'unpublish' ? 'Unpublish' : 'Clear All'}
        secondaryButtonText="Cancel"
        onConfirm={() => {
          if (confirmDialog?.type === 'publish') {
            void confirmPublish();
          } else if (confirmDialog?.type === 'unpublish') {
            void confirmUnpublish();
          } else if (confirmDialog?.type === 'clear') {
            clearAll();
          }
          setConfirmDialog(null);
        }}
        onDismiss={() => setConfirmDialog(null)}
      />

      {/* Save Dialog */}
      {showSaveDialog && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: 8, padding: 24, width: 440, boxShadow: '0 8px 16px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>{saveDialogMode === 'save' ? 'Save' : 'Save As'}</h3>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Product folder</label>
              <Combobox
                freeform
                value={saveDialogProduct}
                onInput={(e) => {
                  const val = sanitizePath((e.target as HTMLInputElement).value);
                  setSaveDialogProduct(val);
                  loadSubfoldersForProduct(val);
                }}
                onOptionSelect={(_e, data) => {
                  const val = data.optionText || '';
                  setSaveDialogProduct(val);
                  loadSubfoldersForProduct(val);
                }}
                placeholder="Select or type a product folder"
                style={{ width: '100%' }}
              >
                {existingProducts.map(p => <Option key={p} value={p}>{p}</Option>)}
              </Combobox>
              <span style={{ fontSize: 11, color: '#605e5c', marginTop: 2, display: 'block' }}>No spaces allowed. Use hyphens or camelCase.</span>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Subfolder <span style={{ fontWeight: 400, color: '#605e5c' }}>(optional)</span></label>
              <Combobox
                freeform
                value={saveDialogSubfolder}
                onInput={(e) => setSaveDialogSubfolder(sanitizePath((e.target as HTMLInputElement).value))}
                onOptionSelect={(_e, data) => setSaveDialogSubfolder(data.optionText || '')}
                placeholder="e.g. en-US or v2"
                style={{ width: '100%' }}
              >
                {existingSubfolders.map(s => <Option key={s} value={s}>{s}</Option>)}
              </Combobox>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>File name</label>
              <input
                type="text"
                value={saveDialogFileName}
                onChange={(e) => setSaveDialogFileName(sanitizePath(e.target.value))}
                style={pageStyles.input}
                placeholder="e.g. welcome-email.html"
                autoFocus
              />
            </div>

            {/* Path preview */}
            {(saveDialogProduct || saveDialogFileName) && (
              <div style={{ marginBottom: 16, padding: '8px 12px', backgroundColor: '#f3f2f1', borderRadius: 4, fontSize: 12, fontFamily: 'Consolas, monospace', color: '#323130' }}>
                <span style={{ color: '#605e5c' }}>Path: </span>
                {sanitizePath(saveDialogProduct.trim())}
                {saveDialogSubfolder.trim() ? '/' + sanitizePath(saveDialogSubfolder.trim()) : ''}
                {saveDialogFileName.trim() ? '/' + sanitizePath(saveDialogFileName.trim()) : ''}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" style={pageStyles.button} onClick={() => setShowSaveDialog(false)}>Cancel</button>
              <button
                type="button"
                style={pageStyles.primaryButton}
                onClick={() => void handleSaveDialogConfirm()}
                disabled={!saveDialogProduct.trim() || !saveDialogFileName.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
