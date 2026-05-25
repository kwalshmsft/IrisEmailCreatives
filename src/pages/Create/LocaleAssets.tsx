import React from 'react';
import { Dialog, DialogSurface, DialogTitle, DialogBody, DialogContent, DialogActions, Button, Input } from '@fluentui/react-components';
import { GlobeRegular, ArrowDownloadRegular, ArrowUploadRegular, DismissRegular, SearchRegular, ChevronRightRegular, ChevronDownRegular } from '@fluentui/react-icons';
import { htmlLocalizationService } from '../../services/htmlLocalizationService';
import { LocalizableString } from '../../models/localization';
import { parseCsvText } from '../../utils/fileUtils';

/** Locale groups by priority */
const LOCALE_GROUPS = [
  {
    label: 'Priority 1',
    locales: [
      'ar-SA', 'bg-BG', 'cs-CZ', 'da-DK', 'de-DE', 'el-GR', 'en-GB', 'en-US',
      'es-ES', 'es-MX', 'et-EE', 'fi-FI', 'fr-CA', 'fr-FR', 'he-IL', 'hr-HR',
      'hu-HU', 'id-ID', 'it-IT', 'ja-JP', 'ko-KR', 'lt-LT', 'lv-LV', 'nb-NO',
      'nl-NL', 'pl-PL', 'pt-BR', 'pt-PT', 'ro-RO', 'ru-RU', 'sk-SK', 'sl-SI',
      'sr-Latn-RS', 'sv-SE', 'th-TH', 'tr-TR', 'uk-UA', 'vi-VN', 'zh-CN', 'zh-TW',
    ],
  },
  {
    label: 'Priority 2',
    locales: [
      'af-ZA', 'az-Latn-AZ', 'bs-Latn-BA', 'ca-ES', 'cy-GB', 'eu-ES', 'fa-IR',
      'gl-ES', 'hi-IN', 'is-IS', 'ka-GE', 'kk-KZ', 'ms-MY', 'nn-NO', 'sq-AL',
      'sr-Cyrl-RS',
    ],
  },
  {
    label: 'Priority 3',
    locales: [
      'am-ET', 'as-IN', 'bn-IN', 'ca-ES-valencia', 'fil-PH', 'ga-IE', 'gd-GB',
      'gu-IN', 'hy-AM', 'km-KH', 'kn-IN', 'kok-IN', 'lb-LU', 'lo-LA', 'mi-NZ',
      'mk-MK', 'ml-IN', 'mr-IN', 'mt-MT', 'ne-NP', 'or-IN', 'pa-IN', 'quz-PE',
      'sr-Cyrl-BA', 'ta-IN', 'te-IN', 'tt-RU', 'ug-CN', 'ur-PK', 'uz-Latn-UZ',
    ],
  },
];

const ALL_LOCALES = LOCALE_GROUPS.flatMap((g) => g.locales);

interface LocaleData {
  locale: string;
  subject: string;
  html: string;
  plainText: string;
}

interface LocaleAssetsProps {
  /** Current HTML content from the editor */
  htmlContent: string;
  /** Source locale of the content being edited */
  sourceLocale: string | null;
  /** Display name of the document (used for download filenames) */
  displayName?: string;
  /** Previously saved locale assets (loaded from gallery entry) */
  initialLocaleData?: LocaleData[];
  /** Callback when locale data changes (for persistence) */
  onLocaleDataChange?: (data: LocaleData[]) => void;
  /** Callback to trigger an immediate save (e.g., after CSV import) */
  onSaveRequested?: () => void;
}

const styles: Record<string, React.CSSProperties> = {
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
  buttonRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  button: {
    border: '1px solid #c8c6c4',
    backgroundColor: '#ffffff',
    color: '#323130',
    borderRadius: 4,
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: 14,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },
  primaryButton: {
    border: '1px solid #0078d4',
    backgroundColor: '#0078d4',
    color: '#ffffff',
    borderRadius: 4,
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: 14,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },
  tabRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 0,
    borderBottom: '1px solid #e1dfdd',
    marginBottom: 12,
  },
  tab: {
    padding: '8px 12px',
    border: 'none',
    borderBottom: '2px solid transparent',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    color: '#605e5c',
  },
  tabActive: {
    padding: '8px 12px',
    border: 'none',
    borderBottom: '2px solid #0078d4',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    color: '#0078d4',
  },
  localePickerContainer: {
    display: 'flex',
    gap: 24,
    minHeight: 400,
  },
  localePickerLeft: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  localePickerRight: {
    width: 200,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    borderLeft: '1px solid #e1dfdd',
    paddingLeft: 16,
  },
  localeList: {
    flex: 1,
    overflowY: 'auto',
    border: '1px solid #e1dfdd',
    borderRadius: 4,
    padding: 8,
    maxHeight: 360,
  },
  localeCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 0',
    fontSize: 14,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 999,
    backgroundColor: '#eff6fc',
    color: '#005a9e',
    fontSize: 12,
    fontWeight: 600,
    gap: 4,
  },
};

function htmlToPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, head').forEach((el) => el.remove());
  doc.querySelectorAll('br').forEach((el) => el.replaceWith('\n'));
  const blockTags = ['p', 'div', 'tr', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'table'];
  blockTags.forEach((tag) => {
    doc.querySelectorAll(tag).forEach((el) => {
      el.insertAdjacentText('afterend', '\n');
    });
  });
  doc.querySelectorAll('a[href]').forEach((el) => {
    const href = el.getAttribute('href') || '';
    const text = el.textContent || '';
    if (href && !href.startsWith('#') && href !== text) {
      el.replaceWith(`${text} (${href})`);
    }
  });
  let text = doc.body?.textContent || '';
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/ ?\n ?/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export const LocaleAssets: React.FC<LocaleAssetsProps> = ({ htmlContent, sourceLocale, displayName, initialLocaleData, onLocaleDataChange, onSaveRequested }) => {
  const [selectedLocales, setSelectedLocales] = React.useState<string[]>(() =>
    (initialLocaleData ?? []).map((d) => d.locale)
  );
  const [showLocalePicker, setShowLocalePicker] = React.useState(false);
  const [localeFilter, setLocaleFilter] = React.useState('');
  const [pickerSelections, setPickerSelections] = React.useState<string[]>([]);
  const [localeData, setLocaleData] = React.useState<LocaleData[]>(initialLocaleData ?? []);

  // Sync when parent reloads a different document
  const prevInitialRef = React.useRef(initialLocaleData);
  React.useEffect(() => {
    if (initialLocaleData !== prevInitialRef.current) {
      prevInitialRef.current = initialLocaleData;
      const data = initialLocaleData ?? [];
      setLocaleData(data);
      setSelectedLocales(data.map((d) => d.locale));
    }
  }, [initialLocaleData]);
  const [collapsed, setCollapsed] = React.useState(true);
  const csvInputRef = React.useRef<HTMLInputElement | null>(null);

  // Notify parent when locale data changes
  React.useEffect(() => {
    onLocaleDataChange?.(localeData);
  }, [localeData, onLocaleDataChange]);

  const filteredLocales = React.useMemo(() => {
    let locales = [...ALL_LOCALES];
    if (localeFilter.trim()) {
      const filter = localeFilter.toLowerCase();
      locales = locales.filter((l) => l.toLowerCase().includes(filter));
    }
    return locales;
  }, [localeFilter]);

  const filteredGroups = React.useMemo(() => {
    const filter = localeFilter.trim().toLowerCase();
    return LOCALE_GROUPS.map((g) => ({
      ...g,
      locales: g.locales.filter((l) => !filter || l.toLowerCase().includes(filter)),
    })).filter((g) => g.locales.length > 0);
  }, [localeFilter]);

  const openLocalePicker = () => {
    // Pre-check source locale if not already selected
    const initial = [...selectedLocales];
    if (sourceLocale && !initial.some((l) => l.toLowerCase() === sourceLocale.toLowerCase())) {
      const match = ALL_LOCALES.find((l) => l.toLowerCase() === sourceLocale.toLowerCase());
      if (match) initial.push(match);
    }
    setPickerSelections(initial);
    setLocaleFilter('');
    setShowLocalePicker(true);
  };

  const handlePickerSave = () => {
    setSelectedLocales(pickerSelections.sort());
    setShowLocalePicker(false);
    // Update locale data: keep existing data for still-selected locales, add empty entries for new ones
    setLocaleData((prev) => {
      const kept = prev.filter((d) => pickerSelections.includes(d.locale));
      const existingLocales = new Set(kept.map((d) => d.locale));
      const newEntries: LocaleData[] = pickerSelections
        .filter((loc) => !existingLocales.has(loc) && (!sourceLocale || loc.toLowerCase() !== sourceLocale.toLowerCase()))
        .map((loc) => ({ locale: loc, subject: '', html: '', plainText: '' }));
      return [...kept, ...newEntries].sort((a, b) => a.locale.localeCompare(b.locale));
    });
    // Save after locale selection changes
    setTimeout(() => onSaveRequested?.(), 250);
  };

  const togglePickerLocale = (locale: string) => {
    setPickerSelections((prev) =>
      prev.includes(locale) ? prev.filter((l) => l !== locale) : [...prev, locale]
    );
  };

  const toggleSelectAll = () => {
    if (pickerSelections.length === filteredLocales.length) {
      setPickerSelections([]);
    } else {
      setPickerSelections([...filteredLocales]);
    }
  };

  const handleDownloadCsv = () => {
    if (!htmlContent || !sourceLocale || selectedLocales.length === 0) return;

    const strings = htmlLocalizationService.extractStrings(htmlContent);
    if (strings.length === 0) return;

    // Build CSV: Row 1 = headers (Locale, key1, key2, ...)
    // Row 2 = types (Locale, type1, type2, ...)
    // Row 3 = source locale with values
    // Row 4+ = target locale rows (empty, for translators to fill)
    const headerRow = ['Locale', ...strings.map((s) => s.key)].map(escapeCsvValue).join(',');
    const typeRow = ['Locale', ...strings.map((s) => s.type)].map(escapeCsvValue).join(',');
    const sourceRow = [sourceLocale, ...strings.map((s) => s.value)].map(escapeCsvValue).join(',');
    const targetRows = selectedLocales
      .filter((l) => l.toLowerCase() !== sourceLocale.toLowerCase())
      .map((locale) => {
        // If we already have data for this locale, include it
        const existing = localeData.find((d) => d.locale === locale);
        if (existing && existing.html) {
          const existingStrings = htmlLocalizationService.extractStrings(existing.html);
          const existingMap = new Map(existingStrings.map((s) => [s.key, s.value]));
          return [locale, ...strings.map((s) => existingMap.get(s.key) ?? '')].map(escapeCsvValue).join(',');
        }
        return [locale, ...strings.map(() => '')].map(escapeCsvValue).join(',');
      });

    const csv = [headerRow, typeRow, sourceRow, ...targetRows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = displayName ? displayName.replace(/[^a-zA-Z0-9_-]/g, '_') : 'localization';
    a.download = `${baseName}_${sourceLocale}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAutoFillFromCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';

    const csvText = await file.text();
    const rows = parseCsvText(csvText);
    if (rows.length < 3) return;

    const headers = rows[0].map((h) => h.trim());
    if (headers[0]?.toLowerCase() !== 'locale') return;

    const keys = headers.slice(1);
    const strings = htmlLocalizationService.extractStrings(htmlContent);

    // Skip row 1 (types) and row 2 (source), process remaining rows as translations
    const newLocaleData: LocaleData[] = [];
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      const localeRaw = (row[0] ?? '').trim();
      if (!localeRaw) continue;

      // Normalize locale to match our format (e.g., "DE-DE" → "de-DE")
      const parts = localeRaw.split('-');
      let locale: string;
      if (parts.length === 2) {
        locale = `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
      } else if (parts.length === 3) {
        locale = `${parts[0].toLowerCase()}-${parts[1].charAt(0).toUpperCase()}${parts[1].slice(1).toLowerCase()}-${parts[2].toUpperCase()}`;
      } else {
        locale = localeRaw;
      }

      // Skip the source locale row
      if (sourceLocale && locale.toLowerCase() === sourceLocale.toLowerCase()) continue;

      // Build translations map
      const translations: Record<string, string> = {};
      let localeSubject = '';
      keys.forEach((key, col) => {
        const value = (row[col + 1] ?? '').trim();
        if (key === 'subject') {
          localeSubject = value;
        } else if (value) {
          translations[key] = value;
        }
      });

      const localizedHtml = Object.keys(translations).length > 0
        ? htmlLocalizationService.generateLocalizedHtml(htmlContent, strings, translations)
        : '';
      const plainText = localizedHtml ? htmlToPlainText(localizedHtml) : '';

      newLocaleData.push({ locale, subject: localeSubject, html: localizedHtml, plainText });
    }

    if (newLocaleData.length > 0) {
      // Add any new locales to the selected list
      const newLocales = newLocaleData.map((d) => d.locale);
      setSelectedLocales((prev) => {
        const combined = new Set([...prev, ...newLocales]);
        return [...combined].sort();
      });

      // Compute merged data synchronously so we can pass it to parent immediately
      const computeMerged = (prev: LocaleData[]) => {
        const merged = [...prev];
        for (const newItem of newLocaleData) {
          const existingIndex = merged.findIndex((d) => d.locale === newItem.locale);
          if (existingIndex >= 0) {
            merged[existingIndex] = newItem;
          } else {
            merged.push(newItem);
          }
        }
        return merged;
      };

      setLocaleData((prev) => computeMerged(prev));
      // Sync to parent and trigger save — use timeout to allow React state update to flush
      const mergedForSave = computeMerged(localeData);
      onLocaleDataChange?.(mergedForSave);
      setTimeout(() => onSaveRequested?.(), 50);
    }
  };

  return (
    <div style={styles.card}>
      <h5
        style={{ ...styles.cardHeader, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none' }}
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <ChevronRightRegular style={{ fontSize: 14 }} /> : <ChevronDownRegular style={{ fontSize: 14 }} />}
        Locale Specific Assets
        {selectedLocales.length > 0 && <span style={{ fontWeight: 400, fontSize: 12, color: '#605e5c' }}>({selectedLocales.length} locale{selectedLocales.length !== 1 ? 's' : ''})</span>}
      </h5>
      {!collapsed && (
      <div style={styles.cardBody}>
        {/* Action buttons */}
        <div style={styles.buttonRow}>
          <button type="button" style={styles.primaryButton} onClick={openLocalePicker}>
            <GlobeRegular /> Choose Locales
          </button>
          <button
            type="button"
            style={{ ...styles.button, opacity: selectedLocales.length === 0 || !sourceLocale ? 0.5 : 1 }}
            disabled={selectedLocales.length === 0 || !sourceLocale}
            onClick={handleDownloadCsv}
          >
            <ArrowDownloadRegular /> Download as CSV
          </button>
          <button
            type="button"
            style={{ ...styles.button, opacity: !sourceLocale ? 0.5 : 1 }}
            disabled={!sourceLocale}
            onClick={() => csvInputRef.current?.click()}
          >
            <ArrowUploadRegular /> Auto-fill from CSV
          </button>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={(e) => void handleAutoFillFromCsv(e)}
          />
        </div>

        {/* Selected locales summary */}
        {selectedLocales.length > 0 && (
          <div style={{ marginBottom: 12, fontSize: 13, color: '#605e5c' }}>
            {selectedLocales.length + 1} locale(s) selected
            {localeData.filter((d) => d.html).length > 0 && ` · ${localeData.filter((d) => d.html).length} localized`}
          </div>
        )}

        {selectedLocales.length === 0 && (
          <p style={{ color: '#605e5c', margin: 0, fontSize: 13 }}>
            Choose locales to prepare content for translation. Download a CSV for translators, then upload the completed CSV to populate translations.
          </p>
        )}
      </div>
      )}

      {/* Locale Picker Dialog */}
      <Dialog open={showLocalePicker} onOpenChange={(_, data) => { if (!data.open) setShowLocalePicker(false); }}>
        <DialogSurface style={{ maxWidth: 700, width: '90vw' }}>
          <DialogTitle>Locales</DialogTitle>
          <DialogBody>
            <DialogContent>
              <div style={styles.localePickerContainer}>
                <div style={styles.localePickerLeft}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Select</div>
                  <Input
                    placeholder="Filter by name"
                    value={localeFilter}
                    onChange={(_, data) => setLocaleFilter(data.value)}
                    contentBefore={<SearchRegular />}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                    <input
                      type="checkbox"
                      checked={pickerSelections.length === filteredLocales.length && filteredLocales.length > 0}
                      onChange={toggleSelectAll}
                    />
                    <span style={{ fontSize: 13, color: '#605e5c' }}>All Locales</span>
                  </div>
                  <div style={styles.localeList}>
                    {filteredGroups.map((group) => (
                      <div key={group.label} style={{ marginBottom: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#323130', padding: '6px 0 4px', borderBottom: '1px solid #edebe9', marginBottom: 4 }}>
                          {group.label} ({group.locales.length})
                        </div>
                        {group.locales.map((locale) => (
                          <label key={locale} style={styles.localeCheckbox}>
                            <input
                              type="checkbox"
                              checked={pickerSelections.includes(locale)}
                              onChange={() => togglePickerLocale(locale)}
                            />
                            {locale}
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={styles.localePickerRight}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Your selections</span>
                  </div>
                  {pickerSelections.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPickerSelections([])}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#a4262c', fontSize: 13, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <DismissRegular style={{ fontSize: 12 }} /> Clear all
                    </button>
                  )}
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {pickerSelections.sort().map((locale) => (
                      <span key={locale} style={styles.badge}>
                        {locale}
                        <button
                          type="button"
                          onClick={() => togglePickerLocale(locale)}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, fontSize: 10, color: '#605e5c' }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="primary" onClick={handlePickerSave}>Save</Button>
              <Button appearance="secondary" onClick={() => setShowLocalePicker(false)}>Cancel</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};
