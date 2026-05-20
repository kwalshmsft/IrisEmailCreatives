import React from 'react';
import { render as renderTemplate } from '../../services/templateRenderService';
import { readFileAsText } from '../../utils/fileUtils';

type NoticeTone = 'success' | 'error' | 'warning';
type HtmlViewMode = 'visual' | 'source';

interface Notice {
  tone: NoticeTone;
  text: string;
}

interface XmlContentVariant {
  locale: string;
  fields: Record<string, string>;
}

interface XmlContentItem {
  name: string;
  variants: XmlContentVariant[];
}

interface RenderedOutput {
  subject: string;
  html: string;
  plainText: string;
  diagnostics: string[];
}

const DEFAULT_MODEL = {
  IsPreview: '',
  FirstName: 'User',
  LastName: '',
};

const DEFAULT_MODEL_JSON = JSON.stringify(DEFAULT_MODEL, null, 2);
const ICMS_PREFIX = '/Sites/Membership.Communication/Global/';
const FIELD_NAMES = {
  html: ['HtmlBodyFormat/Content', 'HtmlBody/Content'],
  subject: ['Subject/Content'],
  plainText: ['PlainTextBody/Content'],
};

const pageStyles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 14,
    color: '#323130',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
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
    margin: 0,
    padding: '10px 16px',
    backgroundColor: '#dce6f0',
    color: '#323130',
    fontWeight: 600,
    fontSize: 16,
  },
  cardBody: {
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  splitRow: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
    alignItems: 'stretch',
  },
  splitCard: {
    flex: '1 1 320px',
    minWidth: 0,
  },
  fieldLabel: {
    fontWeight: 600,
    marginBottom: 4,
  },
  textInput: {
    width: '100%',
    border: '1px solid #c8c6c4',
    borderRadius: 4,
    padding: '8px 10px',
    boxSizing: 'border-box',
    fontSize: 14,
    color: '#323130',
  },
  prefixedRow: {
    display: 'flex',
    alignItems: 'stretch',
    gap: 8,
    flexWrap: 'wrap',
  },
  prefixWrap: {
    display: 'flex',
    flex: '1 1 520px',
    minWidth: 280,
  },
  prefix: {
    border: '1px solid #c8c6c4',
    borderRight: 'none',
    borderRadius: '4px 0 0 4px',
    padding: '8px 10px',
    backgroundColor: '#f3f2f1',
    color: '#605e5c',
    whiteSpace: 'nowrap',
  },
  prefixedInput: {
    flex: 1,
    minWidth: 0,
    border: '1px solid #c8c6c4',
    borderRadius: '0 4px 4px 0',
    padding: '8px 10px',
    boxSizing: 'border-box',
    fontSize: 14,
    color: '#323130',
  },
  helperText: {
    margin: 0,
    color: '#605e5c',
    lineHeight: 1.5,
  },
  buttonRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  button: {
    border: '1px solid #c8c6c4',
    borderRadius: 4,
    padding: '8px 12px',
    backgroundColor: '#ffffff',
    color: '#323130',
    cursor: 'pointer',
    fontSize: 14,
  },
  primaryButton: {
    border: '1px solid #0078d4',
    borderRadius: 4,
    padding: '8px 12px',
    backgroundColor: '#0078d4',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: 14,
  },
  select: {
    width: '100%',
    border: '1px solid #c8c6c4',
    borderRadius: 4,
    padding: '8px 10px',
    boxSizing: 'border-box',
    fontSize: 14,
    color: '#323130',
    backgroundColor: '#ffffff',
  },
  textarea: {
    width: '100%',
    minHeight: 220,
    border: '1px solid #c8c6c4',
    borderRadius: 4,
    padding: 12,
    boxSizing: 'border-box',
    fontFamily: 'Consolas, monospace',
    fontSize: 13,
    color: '#323130',
    resize: 'vertical',
  },
  renderMeta: {
    color: '#107c10',
    fontWeight: 600,
  },
  alert: {
    padding: '10px 12px',
    borderRadius: 4,
    border: '1px solid transparent',
  },
  pre: {
    margin: 0,
    padding: 12,
    border: '1px solid #e0e0e0',
    borderRadius: 4,
    backgroundColor: '#faf9f8',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontFamily: 'Consolas, monospace',
    fontSize: 13,
  },
  iframe: {
    width: '100%',
    height: 500,
    border: '1px solid #e0e0e0',
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  toggleButtonActive: {
    border: '1px solid #0078d4',
    borderRadius: 4,
    padding: '8px 12px',
    backgroundColor: '#eff6fc',
    color: '#005a9e',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  },
  diagnosticsList: {
    margin: 0,
    paddingLeft: 20,
  },
  statusRow: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    color: '#605e5c',
  },
};

const getAlertStyle = (tone: NoticeTone): React.CSSProperties => {
  const palette = {
    success: { background: '#dff6dd', border: '#92c353', color: '#0b6a0b' },
    error: { background: '#fde7e9', border: '#d13438', color: '#a4262c' },
    warning: { background: '#fff4ce', border: '#c19c00', color: '#8a6d00' },
  }[tone];

  return {
    ...pageStyles.alert,
    backgroundColor: palette.background,
    borderColor: palette.border,
    color: palette.color,
  };
};

const parseXmlContent = (xmlContent: string): XmlContentItem[] => {
  const document = new DOMParser().parseFromString(xmlContent, 'application/xml');
  const parserError = document.querySelector('parsererror');
  if (parserError) {
    throw new Error('The XML file could not be parsed.');
  }

  const items = Array.from(document.getElementsByTagName('ExportedContentItem')).map((itemElement, index) => {
    const variants = Array.from(itemElement.getElementsByTagName('Variant')).map((variantElement) => {
      const fields = Array.from(variantElement.getElementsByTagName('Field')).reduce<Record<string, string>>((allFields, field) => {
        const fieldName = field.getAttribute('name')?.trim();
        if (fieldName) {
          allFields[fieldName] = field.textContent ?? '';
        }
        return allFields;
      }, {});

      return {
        locale: variantElement.getAttribute('variantCulture')?.trim() ?? '',
        fields,
      };
    });

    return {
      name: itemElement.getAttribute('name')?.trim() || `Item ${index + 1}`,
      variants,
    };
  });

  return items.filter((item) => item.variants.length > 0);
};

const getFieldValue = (variant: XmlContentVariant | null, names: string[]) => {
  if (!variant) {
    return '';
  }

  return names.map((name) => variant.fields[name]).find((value) => typeof value === 'string') ?? '';
};

const formatRenderTime = (value: Date) =>
  new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(value);

export const Render: React.FC = () => {
  const [icmsPath, setIcmsPath] = React.useState('');
  const [notice, setNotice] = React.useState<Notice | null>(null);
  const [contentItems, setContentItems] = React.useState<XmlContentItem[]>([]);
  const [selectedItemIndex, setSelectedItemIndex] = React.useState(0);
  const [selectedLocale, setSelectedLocale] = React.useState('en-US');
  const [modelJson, setModelJson] = React.useState(DEFAULT_MODEL_JSON);
  const [modelError, setModelError] = React.useState('');
  const [renderedAt, setRenderedAt] = React.useState('');
  const [renderedOutput, setRenderedOutput] = React.useState<RenderedOutput | null>(null);
  const [htmlViewMode, setHtmlViewMode] = React.useState<HtmlViewMode>('visual');

  const selectedItem = contentItems[selectedItemIndex] ?? null;
  const availableLocales = React.useMemo(() => {
    const locales = new Set(
      (selectedItem?.variants ?? []).map((variant) => variant.locale).filter((locale) => locale.length > 0),
    );
    return Array.from(locales).sort((left, right) => left.localeCompare(right));
  }, [selectedItem]);

  React.useEffect(() => {
    if (availableLocales.length === 0) {
      return;
    }

    if (availableLocales.includes(selectedLocale)) {
      return;
    }

    setSelectedLocale(availableLocales.includes('en-US') ? 'en-US' : availableLocales[0]);
  }, [availableLocales, selectedLocale]);

  const selectedVariant = React.useMemo(() => {
    if (!selectedItem) {
      return null;
    }

    return selectedItem.variants.find((variant) => variant.locale === selectedLocale) ?? selectedItem.variants[0] ?? null;
  }, [selectedItem, selectedLocale]);

  const handleFetchPlaceholder = () => {
    setNotice({ tone: 'warning', text: 'ICMS fetch not yet connected. Use the XML upload option below.' });
  };

  const handleXmlUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    try {
      const xmlContent = await readFileAsText(file);
      const parsedItems = parseXmlContent(xmlContent);
      if (parsedItems.length === 0) {
        throw new Error('The XML file did not contain any exported content items.');
      }

      setContentItems(parsedItems);
      setSelectedItemIndex(0);
      const defaultLocale =
        parsedItems[0].variants.find((variant) => variant.locale === 'en-US')?.locale ??
        parsedItems[0].variants[0]?.locale ??
        'en-US';
      setSelectedLocale(defaultLocale);
      setRenderedOutput(null);
      setRenderedAt('');
      setNotice({ tone: 'success', text: `Loaded ${parsedItems.length} content item${parsedItems.length === 1 ? '' : 's'} from ${file.name}.` });
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Unable to read the selected XML file.',
      });
    } finally {
      input.value = '';
    }
  };

  const handleResetModel = () => {
    setModelJson(DEFAULT_MODEL_JSON);
    setModelError('');
  };

  const handleRender = () => {
    if (!selectedVariant) {
      setNotice({ tone: 'warning', text: 'Load an XML export and select a content item before rendering.' });
      return;
    }

    let model: Record<string, any> | null = null;
    try {
      model = modelJson.trim().length > 0 ? (JSON.parse(modelJson) as Record<string, any>) : null;
      setModelError('');
    } catch (error) {
      setModelError(error instanceof Error ? error.message : 'Model JSON is invalid.');
      return;
    }

    const culture = selectedLocale || 'en-US';
    const subject = renderTemplate(getFieldValue(selectedVariant, FIELD_NAMES.subject), model, culture);
    const html = renderTemplate(getFieldValue(selectedVariant, FIELD_NAMES.html), model, culture);
    const plainText = renderTemplate(getFieldValue(selectedVariant, FIELD_NAMES.plainText), model, culture);

    setRenderedOutput({
      subject: subject.html,
      html: html.html,
      plainText: plainText.html,
      diagnostics: Array.from(new Set([...subject.diagnostics, ...html.diagnostics, ...plainText.diagnostics])),
    });
    setRenderedAt(formatRenderTime(new Date()));
  };

  return (
    <div style={pageStyles.page}>
      <header style={pageStyles.header}>
        <h1 style={pageStyles.title}>Render Preview</h1>
        <p style={pageStyles.subtitle}>
          Use this tool to view published content from ICMS. Once content is loaded onto the page, you can
          toggle by locale and specify Model values by name in the JSON field. Note that this tool only shows
          published content; any recent unpublished changes are ignored.
        </p>
      </header>

      <section style={pageStyles.card}>
        <h2 style={pageStyles.cardHeader}>ICMS Content</h2>
        <div style={pageStyles.cardBody}>
          <div>
            <div style={pageStyles.fieldLabel}>ICMS path</div>
            <div style={pageStyles.prefixedRow}>
              <div style={pageStyles.prefixWrap}>
                <span style={pageStyles.prefix}>{ICMS_PREFIX}</span>
                <input
                  type="text"
                  value={icmsPath}
                  onChange={(event) => setIcmsPath(event.target.value)}
                  style={pageStyles.prefixedInput}
                  placeholder="Content/item/path"
                />
              </div>
              <button type="button" style={pageStyles.button} onClick={handleFetchPlaceholder}>
                Fetch
              </button>
            </div>
          </div>

          <div>
            <div style={pageStyles.fieldLabel}>Load exported XML</div>
            <input type="file" accept=".xml,text/xml,application/xml" onChange={handleXmlUpload} />
          </div>

          {contentItems.length > 1 ? (
            <div>
              <div style={pageStyles.fieldLabel}>Content item</div>
              <select
                value={selectedItemIndex}
                onChange={(event) => setSelectedItemIndex(Number(event.target.value))}
                style={pageStyles.select}
              >
                {contentItems.map((item, index) => (
                  <option key={`${item.name}-${index}`} value={index}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {selectedItem ? (
            <div style={pageStyles.statusRow}>
              <span>Selected item: {selectedItem.name}</span>
              <span>Locales: {availableLocales.length > 0 ? availableLocales.join(', ') : 'Manual entry'}</span>
            </div>
          ) : null}

          {notice ? <div style={getAlertStyle(notice.tone)}>{notice.text}</div> : null}
        </div>
      </section>

      <div style={pageStyles.splitRow}>
        <section style={{ ...pageStyles.card, ...pageStyles.splitCard }}>
          <h2 style={pageStyles.cardHeader}>Locale</h2>
          <div style={pageStyles.cardBody}>
            <div style={pageStyles.fieldLabel}>Selected locale</div>
            {availableLocales.length > 0 ? (
              <select
                value={selectedLocale}
                onChange={(event) => setSelectedLocale(event.target.value)}
                style={pageStyles.select}
              >
                {availableLocales.map((locale) => (
                  <option key={locale} value={locale}>
                    {locale}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={selectedLocale}
                onChange={(event) => setSelectedLocale(event.target.value)}
                style={pageStyles.textInput}
                placeholder="en-US"
              />
            )}
          </div>
        </section>

        <section style={{ ...pageStyles.card, ...pageStyles.splitCard }}>
          <h2 style={pageStyles.cardHeader}>Model (JSON)</h2>
          <div style={pageStyles.cardBody}>
            <textarea value={modelJson} onChange={(event) => setModelJson(event.target.value)} style={pageStyles.textarea} />
            <div style={pageStyles.buttonRow}>
              <button type="button" style={pageStyles.button} onClick={handleResetModel}>
                Default
              </button>
            </div>
            {modelError ? <div style={getAlertStyle('error')}>{modelError}</div> : null}
          </div>
        </section>
      </div>

      <div style={pageStyles.buttonRow}>
        <button type="button" style={pageStyles.primaryButton} onClick={handleRender}>
          ▶ Render
        </button>
        {renderedAt ? <span style={pageStyles.renderMeta}>Rendered at {renderedAt}</span> : null}
      </div>

      {renderedOutput && renderedOutput.diagnostics.length > 0 ? (
        <section style={pageStyles.card}>
          <h2 style={pageStyles.cardHeader}>Diagnostics</h2>
          <div style={pageStyles.cardBody}>
            <div style={getAlertStyle('warning')}>
              <ul style={pageStyles.diagnosticsList}>
                {renderedOutput.diagnostics.map((diagnostic) => (
                  <li key={diagnostic}>{diagnostic}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {renderedOutput ? (
        <>
          <section style={pageStyles.card}>
            <h2 style={pageStyles.cardHeader}>Subject</h2>
            <div style={pageStyles.cardBody}>
              <div style={pageStyles.pre}>{renderedOutput.subject || '(empty)'}</div>
            </div>
          </section>

          <section style={pageStyles.card}>
            <h2 style={pageStyles.cardHeader}>HTML Body</h2>
            <div style={pageStyles.cardBody}>
              <div style={pageStyles.buttonRow}>
                <button
                  type="button"
                  style={htmlViewMode === 'visual' ? pageStyles.toggleButtonActive : pageStyles.button}
                  onClick={() => setHtmlViewMode('visual')}
                >
                  Visual
                </button>
                <button
                  type="button"
                  style={htmlViewMode === 'source' ? pageStyles.toggleButtonActive : pageStyles.button}
                  onClick={() => setHtmlViewMode('source')}
                >
                  Source
                </button>
              </div>

              {htmlViewMode === 'visual' ? (
                <iframe title="Rendered HTML preview" srcDoc={renderedOutput.html} style={pageStyles.iframe} />
              ) : (
                <pre style={pageStyles.pre}>{renderedOutput.html || '(empty)'}</pre>
              )}
            </div>
          </section>

          <section style={pageStyles.card}>
            <h2 style={pageStyles.cardHeader}>Plain Text Body</h2>
            <div style={pageStyles.cardBody}>
              <pre style={pageStyles.pre}>{renderedOutput.plainText || '(empty)'}</pre>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
};
