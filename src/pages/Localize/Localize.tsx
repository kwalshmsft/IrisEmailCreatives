import React from 'react';
import * as XLSX from 'xlsx';
import { ArrowDownloadRegular, ArrowUploadRegular, DeleteRegular, FolderRegular } from '@fluentui/react-icons';
import {
  IrisContentInfo,
  IrisImportResult,
  LocalizableString,
  StoredFileInfo,
} from '../../models/localization';
import {
  ParsedTranslatedCsv,
  htmlLocalizationService,
} from '../../services/htmlLocalizationService';
import ConfirmationDialog from '../../components/ConfirmationDialog/ConfirmationDialog';
import { fileStorageService } from '../../services/fileStorageService';
import { irisContentImportService } from '../../services/irisContentImportService';
import { downloadFile, readFileAsText, parseCsvText } from '../../utils/fileUtils';
import { galleryDbService, ContentGalleryEntry } from '../../services/galleryDbService';

type NoticeTone = 'success' | 'error' | 'warning';

interface Notice {
  tone: NoticeTone;
  text: string;
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
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
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
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
    backgroundColor: '#dce6f0',
  },
  cardBody: {
    padding: 16,
    backgroundColor: '#ffffff',
  },
  description: {
    marginTop: 0,
    marginBottom: 12,
    color: '#605e5c',
    lineHeight: 1.5,
  },
  note: {
    marginTop: 0,
    marginBottom: 12,
    color: '#323130',
    fontWeight: 600,
  },
  input: {
    display: 'block',
    width: '100%',
    maxWidth: 420,
    marginBottom: 12,
    padding: '8px 10px',
    borderRadius: 4,
    border: '1px solid #8a8886',
    fontSize: 14,
    boxSizing: 'border-box',
    fontFamily: 'Segoe UI, sans-serif',
  },
  buttonRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  button: {
    border: '1px solid #c8c6c4',
    backgroundColor: '#ffffff',
    color: '#323130',
    borderRadius: 4,
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: 14,
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
  hiddenInput: {
    display: 'none',
  },
  muted: {
    color: '#605e5c',
  },
  primaryButton: {
    border: '1px solid #0078d4',
    backgroundColor: '#0078d4',
    color: '#ffffff',
    borderRadius: 4,
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: 14,
  },
  successButton: {
    border: '1px solid #107c10',
    backgroundColor: '#107c10',
    color: '#ffffff',
    borderRadius: 4,
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: 14,
  },
  linkButton: {
    padding: 0,
    border: 'none',
    background: 'none',
    color: '#005a9e',
    cursor: 'pointer',
    textDecoration: 'underline',
    fontSize: 14,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#dce6f0',
    fontWeight: 600,
    fontSize: 14,
  },
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid #eaeaea',
    verticalAlign: 'top',
    fontSize: 14,
  },
  textarea: {
    width: '100%',
    minHeight: 240,
    border: '1px solid #8a8886',
    borderRadius: 4,
    padding: 12,
    fontFamily: 'Consolas, monospace',
    fontSize: 13,
    boxSizing: 'border-box',
  },
  helperText: {
    marginTop: 8,
    marginBottom: 0,
    color: '#605e5c',
    fontSize: 13,
  },
  badgeRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  select: {
    minWidth: 280,
    padding: '8px 10px',
    borderRadius: 4,
    border: '1px solid #8a8886',
    fontSize: 14,
  },
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

const replaceExtension = (fileName: string, extension: string) => fileName.replace(/\.[^.]+$/, extension);
const MISSING_LOCALE_MESSAGE = 'No locale found in the HTML. Set a locale in the Create tab before localizing.';

const normalizeLocale = (locale: string) => {
  const [language, region] = locale.split('-');
  if (!language) {
    return null;
  }

  return region ? `${language.toLowerCase()}-${region.toUpperCase()}` : language.toLowerCase();
};

const extractLocaleFromHtml = (html: string) => {
  const match = html.match(/<html\b[^>]*\blang\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
  const rawLocale = match?.[1] ?? match?.[2] ?? match?.[3] ?? '';
  const trimmedLocale = rawLocale.trim();

  if (!trimmedLocale || trimmedLocale.toLowerCase() === 'und') {
    return null;
  }

  // Razor/ICMS tokens like @CULTURE.NAME are not real locales
  if (trimmedLocale.startsWith('@')) {
    return null;
  }

  return normalizeLocale(trimmedLocale) ?? trimmedLocale;
};

/** Set or replace the lang attribute on the <html> element. */
const setLocaleInHtml = (html: string, locale: string): string => {
  const htmlTagMatch = html.match(/<html\b[^>]*>/i);
  if (!htmlTagMatch) {
    return html;
  }

  const tag = htmlTagMatch[0];
  const hasLang = /\blang\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i.test(tag);

  let updatedTag: string;
  if (hasLang) {
    updatedTag = tag.replace(/\blang\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i, `lang="${locale}"`);
  } else {
    updatedTag = tag.replace(/<html\b/i, `<html lang="${locale}"`);
  }

  return html.replace(tag, updatedTag);
};

const getAlertStyle = (tone: NoticeTone): React.CSSProperties => {
  const palette = {
    success: { background: '#dff6dd', border: '#92c353', color: '#0b6a0b' },
    error: { background: '#fde7e9', border: '#d13438', color: '#a4262c' },
    warning: { background: '#fff4ce', border: '#c19c00', color: '#8a6d00' },
  }[tone];

  return {
    marginTop: 12,
    padding: '10px 12px',
    borderRadius: 4,
    border: `1px solid ${palette.border}`,
    backgroundColor: palette.background,
    color: palette.color,
  };
};

const getBadgeStyle = (variant: 'default' | 'new' | 'existing' = 'default'): React.CSSProperties => {
  const palette = {
    default: { background: '#eff6fc', color: '#005a9e' },
    new: { background: '#dff6dd', color: '#0b6a0b' },
    existing: { background: '#f3f2f1', color: '#323130' },
  }[variant];

  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: 999,
    backgroundColor: palette.background,
    color: palette.color,
    fontSize: 12,
    fontWeight: 600,
  };
};

const parseLocaleToken = (value: string) => fileStorageService.parseLocale(`sample_${value}.html`);

/** Parse a CSV where each data row's first column is the locale code. */
const parseCsvForLocales = (csvText: string): { locale: string; parsedFile: ParsedTranslatedCsv }[] => {
  const rows = parseCsvText(csvText);
  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((h) => h.trim());

  // Horizontal format: first header is "Locale", remaining headers are keys
  if (headers[0]?.toLowerCase() === 'locale') {
    const keys = headers.slice(1);
    // Row 1 may be types row (skip it); data rows start at index 2 if row[1][0] looks like a type
    const dataStart = rows.length > 2 && /^(text|html|attr)/i.test(rows[1]?.[0] ?? '') ? 2 : 1;
    const results: { locale: string; parsedFile: ParsedTranslatedCsv }[] = [];

    for (let i = dataStart; i < rows.length; i++) {
      const row = rows[i];
      const locale = parseLocaleToken(row[0]?.trim() ?? '');
      if (!locale) continue;
      results.push({
        locale,
        parsedFile: {
          sourceLocale: null,
          rows: keys.map((key, col) => ({
            key,
            source: '',
            translation: row[col + 1] ?? '',
          })).filter((r) => r.key.length > 0 && r.translation.trim().length > 0),
        },
      });
    }
    return results;
  }

  // Vertical format with a Locale column
  const localeIndex = headers.findIndex((h) => h.toLowerCase() === 'locale');
  const keyIndex = headers.findIndex((h) => h.toLowerCase() === 'key');
  const translationIndex = headers.findIndex((h) => h.toLowerCase() === 'translation');

  if (keyIndex < 0 || translationIndex < 0 || localeIndex < 0) {
    // Fall back to standard parsing — locale must be detectable from the data
    const parsedFile = htmlLocalizationService.parseTranslatedCsv(csvText);
    if (parsedFile.sourceLocale) {
      return [{ locale: parsedFile.sourceLocale, parsedFile }];
    }
    return [];
  }

  // Group rows by locale
  const localeMap = new Map<string, ParsedTranslatedCsv['rows']>();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const locale = parseLocaleToken(row[localeIndex]?.trim() ?? '');
    if (!locale) continue;
    const key = (row[keyIndex] ?? '').trim();
    const translation = (row[translationIndex] ?? '').trim();
    if (!key || !translation) continue;
    if (!localeMap.has(locale)) localeMap.set(locale, []);
    localeMap.get(locale)!.push({ key, source: '', translation });
  }

  return Array.from(localeMap.entries()).map(([locale, translationRows]) => ({
    locale,
    parsedFile: { sourceLocale: null, rows: translationRows },
  }));
};

const buildWorkbookBlob = (strings: LocalizableString[], locale: string) => {
  const rows = [
    ['Key', 'Type', 'Original', 'Translation', 'Path', 'Attribute'],
    ...strings.map((entry) => [entry.key, entry.type, entry.value, '', entry.path, entry.attribute]),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, locale || 'Source');
  const output = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  return new Blob([output], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
};

const dedupe = (values: string[]) => Array.from(new Set(values));

const getStoredSourceSummary = (fileName: string) => {
  const html = fileStorageService.getSourceContent(fileName);
  if (!html) {
    return null;
  }

  const strings = htmlLocalizationService.extractStrings(html);
  return {
    fileName,
    html,
    strings,
    locale: extractLocaleFromHtml(html),
    stringCount: strings.length,
  };
};

// --- Folder tree for inline gallery ---
interface FolderNode {
  name: string;
  fullPath: string;
  children: Map<string, FolderNode>;
  entries: ContentGalleryEntry[];
}

const countFolderEntries = (node: FolderNode): number => {
  let count = node.entries.length;
  node.children.forEach((child) => { count += countFolderEntries(child); });
  return count;
};

const buildFolderTree = (entries: ContentGalleryEntry[]): FolderNode => {
  const root: FolderNode = { name: '', fullPath: '', children: new Map(), entries: [] };
  entries.forEach((entry) => {
    const parts = entry.productName.split('/').filter(Boolean);
    let current = root;
    let path = '';
    for (const part of parts) {
      path = path ? `${path}/${part}` : part;
      if (!current.children.has(part)) {
        current.children.set(part, { name: part, fullPath: path, children: new Map(), entries: [] });
      }
      current = current.children.get(part)!;
    }
    current.entries.push(entry);
  });
  return root;
};

const GalleryFolderTree: React.FC<{
  node: FolderNode;
  expandedPaths: string[];
  onToggle: (path: string) => void;
  onSelect: (entry: ContentGalleryEntry) => void;
  depth: number;
}> = ({ node, expandedPaths, onToggle, onSelect, depth }) => {
  const sortedChildren = React.useMemo(
    () => Array.from(node.children.values()).sort((a, b) => a.name.localeCompare(b.name)),
    [node.children]
  );

  // Root node renders children directly
  if (depth < 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {sortedChildren.map((child) => (
          <GalleryFolderTree key={child.fullPath} node={child} expandedPaths={expandedPaths} onToggle={onToggle} onSelect={onSelect} depth={0} />
        ))}
      </div>
    );
  }

  const isExpanded = expandedPaths.includes(node.fullPath);
  const totalCount = countFolderEntries(node);
  const indent = depth * 16;

  return (
    <div style={{ border: depth === 0 ? '1px solid #e1dfdd' : undefined, borderRadius: depth === 0 ? 4 : undefined, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => onToggle(node.fullPath)}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: `6px 10px 6px ${10 + indent}px`,
          border: 'none',
          backgroundColor: depth === 0 ? '#f3f2f1' : '#faf9f8',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
          borderTop: depth > 0 ? '1px solid #edebe9' : undefined,
        }}
      >
        <span style={{ fontSize: 9 }}>{isExpanded ? '▼' : '▶'}</span>
        <FolderRegular style={{ fontSize: 13, color: '#605e5c' }} />
        <strong style={{ fontSize: 13 }}>{node.name}</strong>
        <span style={{ marginLeft: 'auto', color: '#605e5c', fontSize: 11 }}>{totalCount}</span>
      </button>
      {isExpanded && (
        <div>
          {sortedChildren.map((child) => (
            <GalleryFolderTree key={child.fullPath} node={child} expandedPaths={expandedPaths} onToggle={onToggle} onSelect={onSelect} depth={depth + 1} />
          ))}
          {node.entries.map((entry) => (
            <button
              key={`${entry.productName}/${entry.fileName}`}
              type="button"
              onClick={() => onSelect(entry)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: `5px 10px 5px ${10 + indent + 16}px`,
                border: 'none',
                borderTop: '1px solid #edebe9',
                backgroundColor: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 13, color: '#323130' }}>{entry.fileName}</span>
              {entry.lastModifiedUtc && !isNaN(new Date(entry.lastModifiedUtc).getTime()) && (
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#a19f9d' }}>{new Date(entry.lastModifiedUtc).toLocaleDateString()}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const Localize: React.FC = () => {
  const sourceInputRef = React.useRef<HTMLInputElement | null>(null);
  const translationInputRef = React.useRef<HTMLInputElement | null>(null);
  const xmlInputRef = React.useRef<HTMLInputElement | null>(null);
  const [sourceFiles, setSourceFiles] = React.useState<StoredFileInfo[]>([]);
  const [generatedFiles, setGeneratedFiles] = React.useState<StoredFileInfo[]>([]);
  const [currentSourceFileName, setCurrentSourceFileName] = React.useState<string | null>(() => fileStorageService.getAllSources()[0]?.fileName ?? null);
  const [currentSourceProductName, setCurrentSourceProductName] = React.useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = React.useState<string | null>(null);
  const [showResetDialog, setShowResetDialog] = React.useState(false);
  const [sourceNotice, setSourceNotice] = React.useState<Notice | null>(null);
  const [translationNotice, setTranslationNotice] = React.useState<Notice | null>(null);
  const [importNotice, setImportNotice] = React.useState<Notice | null>(null);
  const [irisContent, setIrisContent] = React.useState<IrisContentInfo | null>(null);
  const [selectedImportSource, setSelectedImportSource] = React.useState('');
  const [importResult, setImportResult] = React.useState<IrisImportResult | null>(null);
  const [galleryEntries, setGalleryEntries] = React.useState<ContentGalleryEntry[]>([]);
  const [expandedGalleryPaths, setExpandedGalleryPaths] = React.useState<string[]>([]);

  const refreshFiles = React.useCallback(() => {
    setSourceFiles(fileStorageService.getAllSources());
    setGeneratedFiles(fileStorageService.getAllGenerated());
  }, []);

  React.useEffect(() => {
    refreshFiles();
    // Load gallery entries on mount; migrate old 'Uploads' entries
    galleryDbService.getAllEntries().then(async (all) => {
      for (const e of all) {
        if (e.productName === 'Uploads') {
          await galleryDbService.deleteEntry('Uploads', e.fileName);
          e.productName = 'UploadsFromLocalization';
          await galleryDbService.saveEntry(e);
        }
      }
      setGalleryEntries(all.filter((e) => (e.productName?.trim() || e.fileName?.trim()) && (e.published || e.productName === 'UploadsFromLocalization')));
    });
  }, [refreshFiles]);

  React.useEffect(() => {
    if (!currentSourceFileName) {
      return;
    }

    if (sourceFiles.some((file) => file.fileName === currentSourceFileName)) {
      return;
    }

    setCurrentSourceFileName(sourceFiles[0]?.fileName ?? null);
  }, [currentSourceFileName, sourceFiles]);

  React.useEffect(() => {
    if (selectedImportSource && sourceFiles.some((file) => file.fileName === selectedImportSource)) {
      return;
    }

    setSelectedImportSource(sourceFiles[0]?.fileName ?? '');
  }, [selectedImportSource, sourceFiles]);

  const currentSourceSummary = React.useMemo(
    () => (currentSourceFileName ? getStoredSourceSummary(currentSourceFileName) : null),
    [currentSourceFileName, sourceFiles],
  );

  const downloadLinks = React.useMemo(() => {
    if (!currentSourceSummary || !currentSourceSummary.locale) {
      return null;
    }

    const localeLabel = currentSourceSummary.locale;
    const csv = htmlLocalizationService.exportToCsv(currentSourceSummary.strings, localeLabel);
    const csvBlob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const xlsxBlob = buildWorkbookBlob(currentSourceSummary.strings, localeLabel);

    return {
      csvUrl: URL.createObjectURL(csvBlob),
      csvName: replaceExtension(currentSourceSummary.fileName, '.csv'),
      xlsxUrl: URL.createObjectURL(xlsxBlob),
      xlsxName: replaceExtension(currentSourceSummary.fileName, '.xlsx'),
    };
  }, [currentSourceSummary]);

  React.useEffect(() => {
    return () => {
      if (downloadLinks) {
        URL.revokeObjectURL(downloadLinks.csvUrl);
        URL.revokeObjectURL(downloadLinks.xlsxUrl);
      }
    };
  }, [downloadLinks]);

  const selectedImportSourceInfo = React.useMemo(
    () => sourceFiles.find((file) => file.fileName === selectedImportSource) ?? null,
    [selectedImportSource, sourceFiles],
  );

  const availableGeneratedFiles = React.useMemo(
    () =>
      selectedImportSourceInfo?.baseName
        ? generatedFiles.filter((file) => file.baseName?.toLowerCase() === selectedImportSourceInfo.baseName?.toLowerCase())
        : [],
    [generatedFiles, selectedImportSourceInfo],
  );

  const availableImportLocales = React.useMemo(
    () =>
      dedupe(
        availableGeneratedFiles
          .map((file) => file.locale)
          .filter((locale): locale is string => Boolean(locale)),
      ),
    [availableGeneratedFiles],
  );

  const existingVariantSet = React.useMemo(
    () =>
      new Set(
        (irisContent?.items ?? []).flatMap((item) => item.existingVariants.map((locale) => locale.toLowerCase())),
      ),
    [irisContent],
  );

  const hasWorkspaceData =
    sourceFiles.length > 0 ||
    generatedFiles.length > 0 ||
    Boolean(sourceNotice) ||
    Boolean(translationNotice) ||
    Boolean(importNotice) ||
    Boolean(irisContent) ||
    Boolean(importResult) ||
    Boolean(currentSourceFileName);

  const getSourceStrings = React.useCallback((file: StoredFileInfo) => {
    const sourceHtml = fileStorageService.getSourceContent(file.fileName);
    if (!sourceHtml) {
      throw new Error(`Source file ${file.fileName} is no longer available.`);
    }

    return htmlLocalizationService.extractStrings(sourceHtml);
  }, []);

  const createGeneratedFromParsed = React.useCallback(
    (baseName: string, targetLocale: string, parsedFile: ParsedTranslatedCsv) => {
      const sourceFile = fileStorageService.findSourceByBaseName(baseName);
      if (!sourceFile) {
        throw new Error(`No source HTML file was found for ${baseName}.`);
      }

      const sourceHtml = fileStorageService.getSourceContent(sourceFile.fileName);
      if (!sourceHtml) {
        throw new Error(`Source content for ${sourceFile.fileName} is unavailable.`);
      }

      const originals = htmlLocalizationService.extractStrings(sourceHtml);
      const translations = parsedFile.rows.reduce<Record<string, string>>((lookup, row) => {
        if (row.translation.trim()) {
          lookup[row.key] = row.translation;
        }
        return lookup;
      }, {});
      const localizedHtml = htmlLocalizationService.generateLocalizedHtml(sourceHtml, originals, translations);
      const generatedFileName = `${sourceFile.baseName ?? baseName}_${targetLocale}.html`;

      fileStorageService.storeGenerated(generatedFileName, localizedHtml);
      return generatedFileName;
    },
    [],
  );

  const handleSourceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    try {
      const html = await readFileAsText(file);
      const locale = extractLocaleFromHtml(html);
      const extractedStrings = htmlLocalizationService.extractStrings(html);

      // Save to gallery — only published if locale is set
      const fileName = file.name.endsWith('.html') || file.name.endsWith('.htm') ? file.name : `${file.name}.html`;
      const hasLocale = Boolean(locale);
      const entry: ContentGalleryEntry = {
        productName: 'UploadsFromLocalization',
        fileName,
        htmlContent: html,
        sourceType: 'html',
        lastModifiedUtc: new Date().toISOString(),
        locale: locale || undefined,
        published: hasLocale,
        publishedAtUtc: hasLocale ? new Date().toISOString() : undefined,
        publishedHtml: hasLocale ? html : undefined,
      };
      await galleryDbService.saveEntry(entry);

      fileStorageService.storeSource(fileName, html);

      refreshFiles();
      setCurrentSourceFileName(fileName);
      setCurrentSourceProductName('UploadsFromLocalization');
      setSelectedImportSource(fileName);
      // Refresh gallery entries (show published + unpublished uploads)
      galleryDbService.getAllEntries().then((entries) => {
        setGalleryEntries(entries.filter((e) => e.published || e.productName === 'UploadsFromLocalization'));
      });
      setSourceNotice({
        tone: locale ? 'success' : 'warning',
        text: locale
          ? `Stored ${fileName} for ${locale} with ${extractedStrings.length} localizable strings.`
          : `Stored ${fileName} with ${extractedStrings.length} localizable strings. ${MISSING_LOCALE_MESSAGE}`,
      });
    } catch (error) {
      setSourceNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Unable to load the HTML file.',
      });
    } finally {
      input.value = '';
    }
  };

  const handleToggleGalleryPath = (path: string) => {
    setExpandedGalleryPaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const handleSelectGalleryEntry = (entry: ContentGalleryEntry) => {
    try {
      const fileName = entry.fileName.endsWith('.html') ? entry.fileName : `${entry.fileName}.html`;
      let htmlToUse = entry.publishedHtml || entry.htmlContent;
      const locale = entry.locale || extractLocaleFromHtml(htmlToUse);

      // Stamp the real locale into the HTML (replaces Razor tokens like @CULTURE.NAME)
      if (locale) {
        htmlToUse = setLocaleInHtml(htmlToUse, locale);
      }

      const extractedStrings = htmlLocalizationService.extractStrings(htmlToUse);

      fileStorageService.storeSource(fileName, htmlToUse);
      refreshFiles();
      setCurrentSourceFileName(fileName);
      setCurrentSourceProductName(entry.productName);
      setSelectedImportSource(fileName);
      setSourceNotice({
        tone: locale ? 'success' : 'warning',
        text: locale
          ? `Loaded "${entry.productName} / ${entry.fileName}" — ${extractedStrings.length} localizable strings for ${locale}.`
          : `Loaded "${entry.productName} / ${entry.fileName}" — ${extractedStrings.length} localizable strings. ${MISSING_LOCALE_MESSAGE}`,
      });
    } catch (error) {
      setSourceNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Failed to load gallery entry.' });
    }
  };

  const handleTranslationUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (!currentSourceFileName) {
      setTranslationNotice({ tone: 'error', text: 'Load a source HTML file first before uploading translations.' });
      input.value = '';
      return;
    }

    if (!currentSourceSummary?.locale) {
      setTranslationNotice({ tone: 'error', text: 'The loaded source file has no locale set. Set the locale in the Create tab before uploading translations.' });
      input.value = '';
      return;
    }

    try {
      const extension = file.name.toLowerCase().endsWith('.xlsx') ? '.xlsx' : '.csv';
      const baseName = fileStorageService.parseBaseName(currentSourceFileName);
      if (!baseName) {
        throw new Error('Unable to determine a base name from the loaded source file.');
      }

      const warnings: string[] = [];
      const generatedNames: string[] = [];

      if (extension === '.csv') {
        const csvText = await readFileAsText(file);
        const parsed = parseCsvForLocales(csvText);
        if (parsed.length === 0) {
          throw new Error('No translation data with a detectable locale found in the CSV.');
        }
        for (const { locale, parsedFile } of parsed) {
          generatedNames.push(createGeneratedFromParsed(baseName, locale, parsedFile));
        }
      } else {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        if (workbook.SheetNames.length === 0) {
          throw new Error('The workbook does not contain any sheets.');
        }

        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const csvText = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
          if (!csvText.trim()) {
            return;
          }

          const parsedFile = htmlLocalizationService.parseTranslatedCsv(csvText);
          const sheetLocale = parseLocaleToken(sheetName);

          if (!sheetLocale) {
            warnings.push(`Skipped sheet "${sheetName}" because no locale was detected in the sheet name.`);
            return;
          }

          generatedNames.push(createGeneratedFromParsed(baseName, sheetLocale, parsedFile));
        });
      }

      if (generatedNames.length === 0) {
        throw new Error(warnings[0] ?? 'No localized HTML files were generated.');
      }

      refreshFiles();
      setTranslationNotice({
        tone: warnings.length > 0 ? 'warning' : 'success',
        text:
          warnings.length > 0
            ? `Generated ${generatedNames.length} localized file(s). ${warnings.join(' ')}`
            : `Generated ${generatedNames.length} localized file(s): ${generatedNames.join(', ')}.`,
      });
    } catch (error) {
      setTranslationNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Unable to process the uploaded translation file.',
      });
    } finally {
      input.value = '';
    }
  };

  const handleDeleteGenerated = (fileName: string) => {
    fileStorageService.deleteGenerated(fileName);
    refreshFiles();
    setPreviewFileName((current) => (current === fileName ? null : current));
    setTranslationNotice({ tone: 'success', text: `Deleted ${fileName}.` });
  };

  const handleResetAll = () => {
    const storageWithClears = fileStorageService as typeof fileStorageService & {
      clearAll?: () => void;
      clearSources?: () => void;
      clearGenerated?: () => void;
    };

    if (typeof storageWithClears.clearAll === 'function') {
      storageWithClears.clearAll();
    } else {
      if (typeof storageWithClears.clearSources === 'function') {
        storageWithClears.clearSources();
      } else {
        sourceFiles.forEach((file) => fileStorageService.deleteSource(file.fileName));
      }

      if (typeof storageWithClears.clearGenerated === 'function') {
        storageWithClears.clearGenerated();
      } else {
        generatedFiles.forEach((file) => fileStorageService.deleteGenerated(file.fileName));
      }
    }

    sourceInputRef.current && (sourceInputRef.current.value = '');
    translationInputRef.current && (translationInputRef.current.value = '');
    xmlInputRef.current && (xmlInputRef.current.value = '');
    setCurrentSourceFileName(null);
    setCurrentSourceProductName(null);
    setPreviewFileName(null);
    setSourceFiles([]);
    setGeneratedFiles([]);
    setSourceNotice(null);
    setTranslationNotice(null);
    setImportNotice(null);
    setIrisContent(null);
    setSelectedImportSource('');
    setImportResult(null);
    setGalleryEntries([]);
    setShowResetDialog(false);
    refreshFiles();
  };

  const handleXmlUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    try {
      const xmlContent = await readFileAsText(file);
      const parsedExport = irisContentImportService.parseExport(xmlContent);

      setIrisContent(parsedExport);
      setImportResult(null);
      setImportNotice({
        tone: parsedExport.items.length > 0 ? 'success' : 'warning',
        text:
          parsedExport.items.length > 0
            ? `Parsed ${parsedExport.items.length} Iris content item(s) from ${file.name}.`
            : `${file.name} was parsed, but no content items were detected.`,
      });
    } catch (error) {
      setImportNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Unable to parse the XML export.',
      });
    } finally {
      input.value = '';
    }
  };

  const handleGenerateImportPackage = async () => {
    if (!irisContent) {
      setImportNotice({ tone: 'error', text: 'Upload an Iris Content XML export first.' });
      return;
    }

    if (!selectedImportSourceInfo) {
      setImportNotice({ tone: 'error', text: 'Select a stored source file first.' });
      return;
    }

    if (availableGeneratedFiles.length === 0) {
      setImportNotice({
        tone: 'error',
        text: 'No generated localized files are available for the selected source file.',
      });
      return;
    }

    try {
      const result = await irisContentImportService.generateImportPackage(
        irisContent,
        selectedImportSourceInfo.fileName,
        availableGeneratedFiles,
        (fileName) => fileStorageService.getGeneratedContent(fileName),
      );

      setImportResult(result);
      setImportNotice({
        tone: 'success',
        text: `Created an import package with ${result.variants.length} locale variant(s).`,
      });
    } catch (error) {
      setImportNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Unable to build the import package.',
      });
    }
  };

  const renderNotice = (notice: Notice | null) =>
    notice ? <div style={getAlertStyle(notice.tone)}>{notice.text}</div> : null;

  return (
    <div style={pageStyles.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={pageStyles.title}>Email Content Localization for Iris Content Management</h1>
          <p style={pageStyles.subtitle}>
            Load source HTML, export strings for translation, apply translations, and generate Iris Content import packages.
          </p>
        </div>
        <button
          type="button"
          style={{
            ...pageStyles.button,
            color: '#a4262c',
            borderColor: '#a4262c',
            opacity: hasWorkspaceData ? 1 : 0.6,
            cursor: hasWorkspaceData ? 'pointer' : 'not-allowed',
          }}
          onClick={() => hasWorkspaceData && setShowResetDialog(true)}
          disabled={!hasWorkspaceData}
        >
          <DeleteRegular style={{ marginRight: 4 }} /> Reset
        </button>
      </div>

      <section style={pageStyles.card}>
        <h5 style={pageStyles.cardHeader}>Source Content</h5>
        <div style={pageStyles.cardBody}>
          <p style={pageStyles.description}>
            Upload an .html email file to get started, or load a published file from the content gallery.
          </p>
          <p style={pageStyles.note}>
            Note: The locale is read from the HTML <code>&lt;html lang="..."&gt;</code> attribute, and the subject line comes from the <code>&lt;title&gt;</code> tag.
          </p>
          <input ref={sourceInputRef} type="file" accept=".html,.htm,text/html" style={pageStyles.hiddenInput} onChange={handleSourceUpload} />
          <div style={pageStyles.buttonRow}>
            <button type="button" style={{ ...pageStyles.button, color: '#0078d4', borderColor: '#0078d4' }} onClick={() => sourceInputRef.current?.click()}>
              <ArrowUploadRegular style={{ marginRight: 4 }} /> Upload HTML
            </button>
          </div>

          {galleryEntries.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#323130', marginBottom: 6 }}>Published Email Creatives</div>
              <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #e1dfdd', borderRadius: 4 }}>
                <GalleryFolderTree
                  node={buildFolderTree(galleryEntries)}
                  expandedPaths={expandedGalleryPaths}
                  onToggle={handleToggleGalleryPath}
                  onSelect={handleSelectGalleryEntry}
                  depth={-1}
                />
              </div>
            </div>
          )}
          {galleryEntries.length === 0 && (
            <p style={{ fontSize: 12, color: '#a19f9d', marginTop: 8 }}>No published email creatives found. Publish an email from the Create tab first.</p>
          )}
          {renderNotice(sourceNotice)}

          {currentSourceSummary && (
            <div style={{ marginTop: 16, padding: 12, backgroundColor: '#faf9f8', border: '1px solid #e1dfdd', borderRadius: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: downloadLinks ? 12 : 0 }}>
                <span style={pageStyles.muted}>Loaded:</span>
                <strong style={{ fontSize: 13 }}>{currentSourceSummary.fileName}</strong>
                <span style={{ ...getBadgeStyle(), fontSize: 12 }}>Locale: {currentSourceSummary.locale ?? 'Not set'}</span>
                <span style={{ ...getBadgeStyle('existing'), fontSize: 12 }}>Strings: {currentSourceSummary.stringCount}</span>
                <button
                  type="button"
                  style={{ border: 'none', background: 'none', color: '#605e5c', fontSize: 16, cursor: 'pointer', padding: '0 4px', marginLeft: 'auto' }}
                  onClick={() => {
                    setCurrentSourceFileName(null);
                    setCurrentSourceProductName(null);
                    setSourceNotice(null);
                  }}
                  aria-label="Clear loaded source"
                  title="Clear loaded source"
                >
                  ×
                </button>
              </div>
              {downloadLinks && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#323130', fontWeight: 600 }}>Download localization file:</span>
                  <a
                    href={downloadLinks.csvUrl}
                    download={downloadLinks.csvName}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1px solid #0078d4', color: '#0078d4', borderRadius: 4, textDecoration: 'none', fontSize: 13, fontWeight: 500, backgroundColor: '#fff' }}
                  >
                    <ArrowDownloadRegular style={{ fontSize: 14 }} /> {downloadLinks.csvName}
                  </a>
                  <a
                    href={downloadLinks.xlsxUrl}
                    download={downloadLinks.xlsxName}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1px solid #0078d4', color: '#0078d4', borderRadius: 4, textDecoration: 'none', fontSize: 13, fontWeight: 500, backgroundColor: '#fff' }}
                  >
                    <ArrowDownloadRegular style={{ fontSize: 14 }} /> {downloadLinks.xlsxName}
                  </a>
                </div>
              )}
              {!currentSourceSummary.locale && (
                <div style={{ marginTop: 8, padding: '8px 12px', backgroundColor: '#fff4ce', border: '1px solid #c19c00', borderRadius: 4, color: '#8a6d00', fontSize: 13 }}>
                  <strong>Locale not set.</strong> Localization files cannot be generated without a locale.
                  {currentSourceProductName === 'UploadsFromLocalization'
                    ? <> Open this file in the <strong>Create</strong> tab to set the locale, or delete it below.</>
                    : <> Open this file in the <strong>Create</strong> tab to set the locale.</>
                  }
                </div>
              )}
              {currentSourceProductName === 'UploadsFromLocalization' && (
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    style={{ ...pageStyles.button, color: '#a4262c', borderColor: '#d13438' }}
                    onClick={async () => {
                      const fn = currentSourceSummary.fileName;
                      fileStorageService.deleteSource(fn);
                      await galleryDbService.deleteEntry('UploadsFromLocalization', fn);
                      refreshFiles();
                      setCurrentSourceFileName(null);
                      setCurrentSourceProductName(null);
                      setSourceNotice(null);
                      galleryDbService.getAllEntries().then((entries) => {
                        setGalleryEntries(entries.filter((e) => (e.productName?.trim() || e.fileName?.trim()) && (e.published || e.productName === 'UploadsFromLocalization')));
                      });
                    }}
                  >
                    <DeleteRegular style={{ marginRight: 4 }} /> Delete File
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section style={pageStyles.card}>
        <h5 style={pageStyles.cardHeader}>Translations</h5>
        <div style={pageStyles.cardBody}>
          <p style={pageStyles.description}>
            Add translated strings by row (.csv) or on new locale-named worksheets (.xlsx), save your file, and then upload here.
            The data will merge with the currently loaded .html file to create localized files.
          </p>
          <input ref={translationInputRef} type="file" accept=".csv,.xlsx,text/csv" style={pageStyles.hiddenInput} onChange={handleTranslationUpload} />
          <button type="button" style={pageStyles.button} onClick={() => translationInputRef.current?.click()}>
            <ArrowUploadRegular style={{ marginRight: 4 }} /> Upload Translation File
          </button>
          {renderNotice(translationNotice)}

          {generatedFiles.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <h6 style={{ fontSize: 14, fontWeight: 600, color: '#323130', margin: 0 }}>🌐 Generated Localized Files</h6>
                <button
                  type="button"
                  style={pageStyles.button}
                  onClick={() => {
                    generatedFiles.forEach((file) => {
                      const content = fileStorageService.getGeneratedContent(file.fileName);
                      if (content) {
                        downloadFile(file.fileName, content, 'text/html;charset=utf-8');
                      }
                    });
                  }}
                >
                  <ArrowDownloadRegular style={{ marginRight: 4 }} /> Download All
                </button>
              </div>
              <table style={pageStyles.table}>
                <thead>
                  <tr>
                    <th style={pageStyles.th}>File Name</th>
                    <th style={pageStyles.th}>Locale</th>
                    <th style={pageStyles.th}>Source</th>
                    <th style={pageStyles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedFiles.map((file) => {
                    const sourceFile = file.baseName ? fileStorageService.findSourceByBaseName(file.baseName) : null;
                    const generatedHtml = fileStorageService.getGeneratedContent(file.fileName);
                    const isPreviewOpen = previewFileName === file.fileName;

                    return (
                      <React.Fragment key={file.fileName}>
                        <tr>
                          <td style={pageStyles.td}>
                            <span style={{ fontSize: 14, color: '#323130' }}>{file.fileName}</span>
                          </td>
                          <td style={pageStyles.td}>
                            <span style={getBadgeStyle()}>{file.locale ?? 'Unknown'}</span>
                          </td>
                          <td style={pageStyles.td}>{sourceFile?.fileName ?? '—'}</td>
                          <td style={pageStyles.td}>
                            <div style={pageStyles.buttonRow}>
                              <button
                                type="button"
                                style={pageStyles.button}
                                onClick={() => {
                                  if (!generatedHtml) {
                                    setTranslationNotice({
                                      tone: 'error',
                                      text: `Generated content for ${file.fileName} is unavailable.`,
                                    });
                                    return;
                                  }

                                  setPreviewFileName((current) => (current === file.fileName ? null : file.fileName));
                                }}
                              >
                                {isPreviewOpen ? 'Hide Preview' : 'Preview'}
                              </button>
                              <button
                                type="button"
                                style={pageStyles.button}
                                onClick={() => {
                                  if (!generatedHtml) {
                                    setTranslationNotice({
                                      tone: 'error',
                                      text: `Generated content for ${file.fileName} is unavailable.`,
                                    });
                                    return;
                                  }

                                  downloadFile(file.fileName, generatedHtml, 'text/html;charset=utf-8');
                                }}
                              >
                                Download
                              </button>
                              <button
                                type="button"
                                style={pageStyles.button}
                                onClick={() => handleDeleteGenerated(file.fileName)}
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isPreviewOpen && generatedHtml && (
                          <tr>
                            <td style={{ ...pageStyles.td, backgroundColor: '#faf9f8' }} colSpan={4}>
                              <div style={{ border: '1px solid #e1dfdd', borderRadius: 4, overflow: 'hidden', backgroundColor: '#ffffff' }}>
                                <iframe
                                  title={`Preview ${file.fileName}`}
                                  srcDoc={generatedHtml}
                                  style={{ width: '100%', minHeight: 420, border: 'none' }}
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section style={pageStyles.card}>
        <h5 style={pageStyles.cardHeader}>Iris Content Import</h5>
        <div style={pageStyles.cardBody}>
          <p style={pageStyles.description}>
            Upload the .xml file exported from Iris Content (ICMS) to generate .xml files for the translations above.
            Select the source file used for localization, then generate the import package.
          </p>
          <input ref={xmlInputRef} type="file" accept=".xml,text/xml,application/xml" style={pageStyles.hiddenInput} onChange={handleXmlUpload} />
          <button type="button" style={pageStyles.button} onClick={() => xmlInputRef.current?.click()}>
            <ArrowUploadRegular style={{ marginRight: 4 }} /> Upload XML Export
          </button>
          {renderNotice(importNotice)}
        </div>
      </section>

      {irisContent && (
        <section style={pageStyles.card}>
          <h5 style={pageStyles.cardHeader}>Iris Content Import Results</h5>
          <div style={pageStyles.cardBody}>
            <table style={{ ...pageStyles.table, marginBottom: 16 }}>
              <thead>
                <tr>
                  <th style={pageStyles.th}>Name</th>
                  <th style={pageStyles.th}>ID</th>
                  <th style={pageStyles.th}>Existing Variants</th>
                </tr>
              </thead>
              <tbody>
                {irisContent.items.length > 0 ? (
                  irisContent.items.map((item) => (
                    <tr key={item.id}>
                      <td style={pageStyles.td}>{item.name}</td>
                      <td style={pageStyles.td}>{item.id}</td>
                      <td style={pageStyles.td}>
                        <div style={pageStyles.badgeRow}>
                          {item.existingVariants.length > 0 ? (
                            item.existingVariants.map((variant) => (
                              <span key={`${item.id}-${variant}`} style={getBadgeStyle('existing')}>
                                {variant}
                              </span>
                            ))
                          ) : (
                            <span style={pageStyles.helperText}>None</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td style={pageStyles.td} colSpan={3}>
                      No content items were detected in the uploaded XML.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div style={{ ...pageStyles.buttonRow, marginBottom: 12 }}>
              <label htmlFor="import-source-select" style={{ fontWeight: 600 }}>
                Source file:
              </label>
              <select
                id="import-source-select"
                style={pageStyles.select}
                value={selectedImportSource}
                onChange={(event) => setSelectedImportSource(event.target.value)}
              >
                {sourceFiles.length === 0 ? (
                  <option value="">No source files available</option>
                ) : (
                  sourceFiles.map((file) => (
                    <option key={file.fileName} value={file.fileName}>
                      {file.fileName}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Available locales</div>
              <div style={pageStyles.badgeRow}>
                {availableImportLocales.length > 0 ? (
                  availableImportLocales.map((locale) => (
                    <span
                      key={locale}
                      style={getBadgeStyle(existingVariantSet.has(locale.toLowerCase()) ? 'existing' : 'new')}
                    >
                      {locale} {existingVariantSet.has(locale.toLowerCase()) ? '(existing)' : '(new)'}
                    </span>
                  ))
                ) : (
                  <span style={pageStyles.helperText}>No generated locales available for the selected source.</span>
                )}
              </div>
            </div>

            <div style={pageStyles.buttonRow}>
              <button type="button" style={pageStyles.primaryButton} onClick={handleGenerateImportPackage}>
                Generate Import Package
              </button>
              {importResult && (
                <>
                  <button
                    type="button"
                    style={pageStyles.successButton}
                    onClick={() => downloadFile('iris-import-package.zip', importResult.zipBlob, 'application/zip')}
                  >
                    Download .zip result
                  </button>
                  <span style={pageStyles.helperText}>Variants: {importResult.variants.join(', ') || 'None'}</span>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      <ConfirmationDialog
        hidden={!showResetDialog}
        title="Reset localization workspace"
        subText="This will clear the stored source and generated files, notices, and any import results for the Localize tab."
        primaryButtonText="Reset"
        secondaryButtonText="Cancel"
        onConfirm={handleResetAll}
        onDismiss={() => setShowResetDialog(false)}
      />
    </div>
  );
};
