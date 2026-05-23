import React from 'react';
import JSZip from 'jszip';
import { ArrowDownloadRegular, ArrowUploadRegular } from '@fluentui/react-icons';
import { galleryDbService, ContentGalleryEntry } from '../../services/galleryDbService';
import { transformForPublish } from '../../services/rtlService';

// --- Types ---
interface IcmsItem {
  id: string;
  name: string;
  path: string;
}

// --- Styles ---
const pageStyles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    fontFamily: 'Segoe UI, sans-serif',
    fontSize: 14,
  },
  title: {
    margin: '12px 0 16px 0',
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
  button: {
    border: '1px solid #c8c6c4',
    backgroundColor: '#ffffff',
    color: '#323130',
    borderRadius: 4,
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: 14,
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
  hiddenInput: {
    display: 'none',
  },
  buttonRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: 999,
    backgroundColor: '#eff6fc',
    color: '#005a9e',
    fontSize: 12,
    fontWeight: 600,
  },
};

const getAlertStyle = (tone: 'success' | 'error' | 'warning'): React.CSSProperties => {
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

// --- ICMS XML parsing ---
const parseIcmsExport = (xmlContent: string): IcmsItem | null => {
  const doc = new DOMParser().parseFromString(xmlContent, 'application/xml');
  if (doc.querySelector('parsererror')) return null;

  // Look for the content item element (typically has an id attribute that's a GUID)
  const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Search for id attributes or elements containing GUIDs
  const allElements = Array.from(doc.getElementsByTagName('*'));
  for (const el of allElements) {
    const id = el.getAttribute('id') || el.getAttribute('ID') || el.getAttribute('Id');
    if (id && guidPattern.test(id.trim())) {
      const name = el.getAttribute('name') || el.getAttribute('Name') || el.tagName;
      const path = el.getAttribute('path') || el.getAttribute('Path') || '';
      return { id: id.trim(), name, path };
    }
  }

  // Try text content of elements named 'id' or 'guid'
  for (const el of allElements) {
    const tagLower = el.tagName.toLowerCase();
    if ((tagLower === 'id' || tagLower === 'guid' || tagLower === 'contentid') && el.textContent) {
      const text = el.textContent.trim();
      if (guidPattern.test(text)) {
        const parent = el.parentElement;
        const name = parent?.getAttribute('name') || parent?.getAttribute('Name') || parent?.tagName || '';
        const path = parent?.getAttribute('path') || parent?.getAttribute('Path') || '';
        return { id: text, name, path };
      }
    }
  }

  return null;
};

// --- ICMS import XML generation ---
const buildIcmsVariantXml = (
  html: string,
  plainText: string,
  subjectLine: string,
): string => {
  // Build Razor subject template
  const subjectRazor = `@{ string subject = "${subjectLine.replace(/"/g, '\\"')}"; try { if (!string.IsNullOrEmpty(Model.IsPreview)) {subject = "[**PROOF: " + Culture.Name + "] " + subject;}; } catch { } }@subject`;

  return `<?xml version="1.0" encoding="utf-8"?>
<content variantCulture="InvariantCulture">
  <field name="Subject"><![CDATA[${subjectRazor}]]></field>
  <field name="Body"><![CDATA[${html}]]></field>
  <field name="PlainTextBody"><![CDATA[${plainText}]]></field>
</content>`;
};

const extractSubjectFromHtml = (html: string): string => {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.trim() || '';
};

// --- Simple list for creative selection ---
const CreativeList: React.FC<{
  entries: ContentGalleryEntry[];
  onSelect: (entry: ContentGalleryEntry) => void;
  selectedEntry: ContentGalleryEntry | null;
}> = ({ entries, onSelect, selectedEntry }) => {
  if (entries.length === 0) {
    return <p style={{ color: '#a19f9d', fontStyle: 'italic', padding: '8px 12px', margin: 0, fontSize: 13 }}>No published creatives found. Publish an email from the Create tab first.</p>;
  }

  return (
    <div style={{ border: '1px solid #e1dfdd', borderRadius: 4, overflow: 'hidden' }}>
      {entries.map((entry) => {
        const isSelected = selectedEntry?.contentId === entry.contentId;
        const hasLocaleAssets = (entry.localeAssets?.length ?? 0) > 0;
        return (
          <button
            key={entry.contentId}
            type="button"
            onClick={() => onSelect(entry)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '8px 12px',
              border: 'none',
              borderTop: '1px solid #edebe9',
              backgroundColor: isSelected ? '#deecf9' : '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 13, color: '#323130', fontWeight: 500 }}>{entry.displayName}</span>
            <span style={{ fontSize: 11, color: '#605e5c' }}>({entry.surfaceName})</span>
            {hasLocaleAssets && (
              <span style={{ fontSize: 10, color: '#107c10', fontWeight: 600 }}>🌐 {entry.localeAssets!.length}</span>
            )}
            {!hasLocaleAssets && (
              <span style={{ fontSize: 10, color: '#a19f9d' }}>No translations</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

// --- Main Component ---
export const Localize: React.FC = () => {
  const xmlInputRef = React.useRef<HTMLInputElement | null>(null);
  const [galleryEntries, setGalleryEntries] = React.useState<ContentGalleryEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = React.useState<ContentGalleryEntry | null>(null);
  const [icmsItem, setIcmsItem] = React.useState<IcmsItem | null>(null);
  const [icmsFileName, setIcmsFileName] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<{ tone: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [generatedZip, setGeneratedZip] = React.useState<Blob | null>(null);
  const [generatedLocales, setGeneratedLocales] = React.useState<string[]>([]);

  React.useEffect(() => {
    galleryDbService.getAllEntries().then((all) => {
      setGalleryEntries(all.filter((e) => e.published));
    });
  }, []);

  const handleSelectEntry = (entry: ContentGalleryEntry) => {
    setSelectedEntry(entry);
    setGeneratedZip(null);
    setGeneratedLocales([]);
    setNotice(null);
  };

  const handleXmlUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const item = parseIcmsExport(text);
      if (!item) {
        setNotice({ tone: 'error', text: 'Could not find a content item GUID in the XML file.' });
        setIcmsItem(null);
        setIcmsFileName(null);
        return;
      }
      setIcmsItem(item);
      setIcmsFileName(file.name);
      setNotice({ tone: 'success', text: `Found ICMS item: "${item.name}" (${item.id})` });
      setGeneratedZip(null);
      setGeneratedLocales([]);
    } catch {
      setNotice({ tone: 'error', text: 'Failed to parse XML file.' });
    } finally {
      input.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!selectedEntry || !icmsItem) return;

    const localeAssets = selectedEntry.localeAssets;
    if (!localeAssets || localeAssets.length === 0) {
      setNotice({ tone: 'error', text: 'The selected creative has no locale translations. Add translations on the Create tab first.' });
      return;
    }

    try {
      const zip = new JSZip();
      const locales: string[] = [];

      for (const asset of localeAssets) {
        if (!asset.html) continue; // Skip empty/unpopulated locales
        const html = transformForPublish(asset.html);
        const plainText = asset.plainText || '';
        const subject = asset.subject || extractSubjectFromHtml(asset.html);
        const xml = buildIcmsVariantXml(html, plainText, subject);

        // Folder name = locale (e.g., "de-DE")
        const folder = zip.folder(asset.locale);
        folder?.file(`${icmsItem.id}.xml`, xml);
        locales.push(asset.locale);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      setGeneratedZip(blob);
      setGeneratedLocales(locales.sort());
      setNotice({ tone: 'success', text: `Generated ICMS import package with ${locales.length} locale(s).` });
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof Error ? err.message : 'Failed to generate package.' });
    }
  };

  const handleDownload = () => {
    if (!generatedZip) return;
    const url = URL.createObjectURL(generatedZip);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IcmsImport_${selectedEntry?.displayName?.replace(/\s+/g, '-') || 'package'}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectedLocaleAssets = selectedEntry?.localeAssets ?? [];

  return (
    <div style={pageStyles.page}>
      <div>
        <h1 style={pageStyles.title}>ICMS Import Package Generator</h1>
        <p style={pageStyles.subtitle}>
          Select a published creative with locale translations, upload its ICMS XML export, and generate the import package.
        </p>
      </div>

      {/* Step 1: Select creative */}
      <section style={pageStyles.card}>
        <h5 style={pageStyles.cardHeader}>1. Select Published Creative</h5>
        <div style={pageStyles.cardBody}>
          <p style={pageStyles.description}>
            Choose a published email that has locale translations (added via the Create tab's Locale Specific Assets).
          </p>
          {galleryEntries.length > 0 ? (
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              <CreativeList
                entries={galleryEntries}
                onSelect={handleSelectEntry}
                selectedEntry={selectedEntry}
              />
            </div>
          ) : (
            <p style={{ fontSize: 12, color: '#a19f9d' }}>No published creatives found. Publish an email from the Create tab first.</p>
          )}

          {selectedEntry && (
            <div style={{ marginTop: 12, padding: 12, backgroundColor: '#faf9f8', border: '1px solid #e1dfdd', borderRadius: 4 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <strong>{selectedEntry.displayName}</strong>
                <span style={pageStyles.badge}>Locale: {selectedEntry.locale || 'Not set'}</span>
                <span style={pageStyles.badge}>{selectedLocaleAssets.length} translation(s)</span>
              </div>
              {selectedLocaleAssets.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {selectedLocaleAssets.map((a) => (
                    <span key={a.locale} style={{ fontSize: 11, padding: '2px 6px', backgroundColor: '#dff6dd', borderRadius: 3, color: '#0b6a0b' }}>
                      {a.locale}
                    </span>
                  ))}
                </div>
              )}
              {selectedLocaleAssets.length === 0 && (
                <div style={{ ...getAlertStyle('warning'), marginTop: 8 }}>
                  This creative has no locale translations. Go to the Create tab and use "Locale Specific Assets" to add translations via CSV.
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Step 2: Upload ICMS XML */}
      <section style={pageStyles.card}>
        <h5 style={pageStyles.cardHeader}>2. Upload ICMS XML Export</h5>
        <div style={pageStyles.cardBody}>
          <p style={pageStyles.description}>
            Upload the .xml file exported from ICMS for this content item. This provides the item GUID needed for the import package.
          </p>
          <input ref={xmlInputRef} type="file" accept=".xml,text/xml,application/xml" style={pageStyles.hiddenInput} onChange={handleXmlUpload} />
          <div style={pageStyles.buttonRow}>
            <button type="button" style={{ ...pageStyles.button, color: '#0078d4', borderColor: '#0078d4' }} onClick={() => xmlInputRef.current?.click()}>
              <ArrowUploadRegular style={{ marginRight: 4 }} /> Upload XML Export
            </button>
            {icmsItem && (
              <span style={{ fontSize: 13, color: '#323130' }}>
                <strong>{icmsFileName}</strong> → Item: <strong>{icmsItem.name}</strong> ({icmsItem.id})
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Step 3: Generate */}
      <section style={pageStyles.card}>
        <h5 style={pageStyles.cardHeader}>3. Generate Import Package</h5>
        <div style={pageStyles.cardBody}>
          <p style={pageStyles.description}>
            Creates a zip file with locale folders, each containing a <code>{icmsItem?.id || '<GUID>'}.xml</code> file ready for ICMS import.
          </p>
          <div style={pageStyles.buttonRow}>
            <button
              type="button"
              style={{
                ...pageStyles.primaryButton,
                opacity: selectedEntry && icmsItem && selectedLocaleAssets.length > 0 ? 1 : 0.5,
                cursor: selectedEntry && icmsItem && selectedLocaleAssets.length > 0 ? 'pointer' : 'not-allowed',
              }}
              disabled={!selectedEntry || !icmsItem || selectedLocaleAssets.length === 0}
              onClick={handleGenerate}
            >
              Generate ICMS Import Package
            </button>
            {generatedZip && (
              <button type="button" style={pageStyles.successButton} onClick={handleDownload}>
                <ArrowDownloadRegular style={{ marginRight: 4 }} /> Download .zip
              </button>
            )}
          </div>
          {generatedLocales.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Generated locales ({generatedLocales.length}):</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {generatedLocales.map((l) => (
                  <span key={l} style={{ fontSize: 11, padding: '2px 6px', backgroundColor: '#eff6fc', borderRadius: 3, color: '#005a9e' }}>
                    {l}
                  </span>
                ))}
              </div>
            </div>
          )}
          {notice && <div style={getAlertStyle(notice.tone)}>{notice.text}</div>}
        </div>
      </section>
    </div>
  );
};
