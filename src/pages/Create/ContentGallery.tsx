import React from 'react';
import { ContentGalleryEntry, galleryDbService } from '../../services/galleryDbService';
import { GlobeRegular, LockClosedRegular, FolderRegular, EditRegular } from '@fluentui/react-icons';
import ConfirmationDialog from '../../components/ConfirmationDialog/ConfirmationDialog';

export interface ContentGallerySaveRequest {
  htmlContent: string;
  sourceType: 'html';
  defaultProductName?: string;
  defaultFileName?: string;
  defaultLocale?: string;
}

export interface ContentGalleryHandle {
  openSaveDialog: (request: ContentGallerySaveRequest) => void;
  refresh: () => Promise<void>;
}

interface ContentGalleryProps {
  onOpen: (entry: ContentGalleryEntry) => void;
  onSaveCompleted?: (entry: ContentGalleryEntry) => void;
}

const baseButtonStyle: React.CSSProperties = {
  borderRadius: 4,
  padding: '8px 12px',
  border: '1px solid #c8c6c4',
  backgroundColor: '#ffffff',
  color: '#323130',
  cursor: 'pointer',
  fontSize: 14,
};

const primaryButtonStyle: React.CSSProperties = {
  ...baseButtonStyle,
  borderColor: '#0078d4',
  backgroundColor: '#0078d4',
  color: '#ffffff',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 4,
  border: '1px solid #8a8886',
  fontFamily: 'Segoe UI, sans-serif',
  fontSize: 14,
  boxSizing: 'border-box',
};

/** Extract locale from <html lang="..."> attribute */
const extractHtmlLocale = (html: string): string | null => {
  const match = html.match(/<html[^>]*\slang=["']([^"']+)["']/i);
  return match ? match[1] : null;
};

/** Set or update the lang attribute on the <html> element */
const setHtmlLocale = (html: string, locale: string): string => {
  if (/<html[^>]*\slang=["'][^"']*["']/i.test(html)) {
    return html.replace(/(<html[^>]*\slang=["'])[^"']*(["'])/i, `$1${locale}$2`);
  }
  return html.replace(/<html([^>]*)>/i, `<html$1 lang="${locale}">`);
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

interface FolderNode {
  name: string;
  fullPath: string;
  children: Map<string, FolderNode>;
  entries: ContentGalleryEntry[];
}

/** Count all entries in a node and its subtree */
const countEntries = (node: FolderNode): number => {
  let count = node.entries.length;
  node.children.forEach((child) => { count += countEntries(child); });
  return count;
};

const FolderTreeView: React.FC<{
  node: FolderNode;
  expandedPaths: string[];
  onToggle: (path: string) => void;
  onOpen: (entry: ContentGalleryEntry) => void;
  onDelete: (entry: ContentGalleryEntry) => void;
  onRename: (entry: ContentGalleryEntry) => void;
  renamingEntry: { productName: string; fileName: string } | null;
  renameValues: { folderPath: string; fileName: string };
  onRenameChange: (field: 'folderPath' | 'fileName', value: string) => void;
  onRenameConfirm: () => void;
  onRenameCancel: () => void;
  depth: number;
}> = ({ node, expandedPaths, onToggle, onOpen, onDelete, onRename, renamingEntry, renameValues, onRenameChange, onRenameConfirm, onRenameCancel, depth }) => {
  const sortedChildren = React.useMemo(
    () => Array.from(node.children.values()).sort((a, b) => a.name.localeCompare(b.name)),
    [node.children]
  );

  // Root node (depth -1) renders children directly
  if (depth < 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {sortedChildren.map((child) => (
          <FolderTreeView key={child.fullPath} node={child} expandedPaths={expandedPaths} onToggle={onToggle} onOpen={onOpen} onDelete={onDelete} onRename={onRename} renamingEntry={renamingEntry} renameValues={renameValues} onRenameChange={onRenameChange} onRenameConfirm={onRenameConfirm} onRenameCancel={onRenameCancel} depth={0} />
        ))}
      </div>
    );
  }

  const isExpanded = expandedPaths.includes(node.fullPath);
  const totalCount = countEntries(node);
  const indent = depth * 16;

  return (
    <div style={{ border: depth === 0 ? '1px solid #e1dfdd' : undefined, borderRadius: depth === 0 ? 4 : undefined, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => onToggle(node.fullPath)}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: `8px 12px 8px ${12 + indent}px`,
          border: 'none',
          backgroundColor: depth === 0 ? '#f3f2f1' : '#faf9f8',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
          borderTop: depth > 0 ? '1px solid #edebe9' : undefined,
        }}
      >
        <span style={{ fontSize: 10 }}>{isExpanded ? '▼' : '▶'}</span>
        <FolderRegular style={{ fontSize: 14, color: '#605e5c' }} />
        <strong style={{ fontSize: 13 }}>{node.name}</strong>
        <span style={{ marginLeft: 'auto', color: '#605e5c', fontSize: 12 }}>{totalCount}</span>
      </button>
      {isExpanded ? (
        <div>
          {/* Render subfolders */}
          {sortedChildren.map((child) => (
            <FolderTreeView key={child.fullPath} node={child} expandedPaths={expandedPaths} onToggle={onToggle} onOpen={onOpen} onDelete={onDelete} onRename={onRename} renamingEntry={renamingEntry} renameValues={renameValues} onRenameChange={onRenameChange} onRenameConfirm={onRenameConfirm} onRenameCancel={onRenameCancel} depth={depth + 1} />
          ))}
          {/* Render files at this level */}
          {node.entries.map((entry) => {
            const isRenaming = renamingEntry?.productName === entry.productName && renamingEntry?.fileName === entry.fileName;
            return isRenaming ? (
              <div
                key={`${entry.productName}/${entry.fileName}`}
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  padding: `6px 12px 6px ${12 + indent + 16}px`,
                  borderTop: '1px solid #edebe9',
                  backgroundColor: '#f3f2f1',
                  flexWrap: 'wrap',
                }}
              >
                <input
                  value={renameValues.folderPath}
                  onChange={(e) => onRenameChange('folderPath', e.target.value)}
                  placeholder="Folder path"
                  style={{ ...inputStyle, flex: 1, minWidth: 140, padding: '4px 8px', fontSize: 12 }}
                />
                <span style={{ color: '#605e5c' }}>/</span>
                <input
                  value={renameValues.fileName}
                  onChange={(e) => onRenameChange('fileName', e.target.value)}
                  placeholder="File name"
                  style={{ ...inputStyle, flex: 1, minWidth: 100, padding: '4px 8px', fontSize: 12 }}
                />
                <button type="button" style={{ ...primaryButtonStyle, padding: '4px 8px', fontSize: 12 }} onClick={onRenameConfirm}>Save</button>
                <button type="button" style={{ ...baseButtonStyle, padding: '4px 8px', fontSize: 12 }} onClick={onRenameCancel}>Cancel</button>
              </div>
            ) : (
              <div
                key={`${entry.productName}/${entry.fileName}`}
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  padding: `4px 12px 4px ${12 + indent + 16}px`,
                  borderTop: '1px solid #edebe9',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {entry.fileName}
                  {!entry.published ? (
                    <button type="button" onClick={() => onRename(entry)} title="Rename / Move" style={{ background: 'none', border: 'none', color: '#0078d4', cursor: 'pointer', fontSize: 12, padding: 0, display: 'inline-flex' }}>
                      <EditRegular />
                    </button>
                  ) : null}
                </span>
                <span style={{ marginLeft: 'auto', color: '#605e5c', fontSize: 12, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {entry.locale ? <><GlobeRegular style={{ fontSize: 12 }} /> {entry.locale} · </> : ''}{formatDate(entry.lastModifiedUtc)}
                </span>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center', width: 100, justifyContent: 'flex-end' }}>
                  <button type="button" style={{ ...baseButtonStyle, padding: '4px 8px', fontSize: 12, width: 44 }} onClick={() => onOpen(entry)}>
                    Open
                  </button>
                  {entry.published ? (
                    <span style={{ display: 'inline-flex', justifyContent: 'center', width: 48 }}>
                      <LockClosedRegular style={{ fontSize: 14, color: '#107c10' }} />
                    </span>
                  ) : (
                    <button type="button" style={{ ...baseButtonStyle, padding: '4px 8px', fontSize: 12, width: 48 }} onClick={() => void onDelete(entry)}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export const ContentGallery = React.forwardRef<ContentGalleryHandle, ContentGalleryProps>(
  ({ onOpen, onSaveCompleted }, ref) => {
    const [entries, setEntries] = React.useState<ContentGalleryEntry[]>([]);
    const [expandedProducts, setExpandedProducts] = React.useState<string[]>([]);
    const [saveRequest, setSaveRequest] = React.useState<ContentGallerySaveRequest | null>(null);
    const [productName, setProductName] = React.useState('');
    const [fileName, setFileName] = React.useState('');
    const [saveError, setSaveError] = React.useState<string | null>(null);
    const [locale, setLocale] = React.useState('');
    const [pendingDelete, setPendingDelete] = React.useState<ContentGalleryEntry | null>(null);
    const [renamingEntry, setRenamingEntry] = React.useState<{ productName: string; fileName: string } | null>(null);
    const [renameValues, setRenameValues] = React.useState<{ folderPath: string; fileName: string }>({ folderPath: '', fileName: '' });

    const refresh = React.useCallback(async () => {
      const allEntries = await galleryDbService.getAllEntries();
      setEntries(allEntries.filter((e) => e.productName.trim() && e.fileName.trim()));
    }, []);

    React.useEffect(() => {
      void refresh();
    }, [refresh]);

    const productNames = React.useMemo(
      () => Array.from(new Set(entries.map((entry) => entry.productName))).sort((left, right) => left.localeCompare(right)),
      [entries]
    );

    // Build a nested tree structure from slash-separated productName paths
    const folderTree = React.useMemo(() => {
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
    }, [entries]);

    React.useImperativeHandle(
      ref,
      () => ({
        openSaveDialog: (request) => {
          setSaveRequest(request);
          setProductName(request.defaultProductName || '');
          setFileName(request.defaultFileName || '');
          setSaveError(null);
          // Determine locale: from request, from HTML, or blank (will prompt user)
          const htmlLocale = extractHtmlLocale(request.htmlContent);
          setLocale(request.defaultLocale || htmlLocale || '');
        },
        refresh,
      }),
      [refresh]
    );

    const toggleProduct = (name: string) => {
      setExpandedProducts((current) =>
        current.includes(name) ? current.filter((item) => item !== name) : [...current, name]
      );
    };

    const closeDialog = () => {
      setSaveRequest(null);
      setProductName('');
      setFileName('');
      setLocale('');
      setSaveError(null);
    };

    const handleSave = async () => {
      if (!saveRequest) {
        return;
      }

      if (!productName.trim() || !fileName.trim()) {
        setSaveError('Both folder path and file name are required.');
        return;
      }

      if (!locale.trim()) {
        setSaveError('A locale is required (e.g., en-US, fr, ja-JP).');
        return;
      }

      // Embed locale into HTML via <html lang="...">
      const htmlWithLocale = setHtmlLocale(saveRequest.htmlContent, locale.trim());

      const entry: ContentGalleryEntry = {
        productName: productName.trim(),
        fileName: fileName.trim(),
        htmlContent: htmlWithLocale,
        sourceType: 'html',
        lastModifiedUtc: new Date().toISOString(),
        locale: locale.trim(),
      };

      await galleryDbService.saveEntry(entry);
      await refresh();
      // Expand all ancestor folder paths so the saved entry is visible
      const parts = entry.productName.split('/').filter(Boolean);
      const pathsToExpand: string[] = [];
      let accumulated = '';
      for (const part of parts) {
        accumulated = accumulated ? `${accumulated}/${part}` : part;
        pathsToExpand.push(accumulated);
      }
      setExpandedProducts((current) => {
        const merged = new Set([...current, ...pathsToExpand]);
        return Array.from(merged);
      });
      onSaveCompleted?.(entry);
      closeDialog();
    };

    const handleDelete = async (entry: ContentGalleryEntry) => {
      setPendingDelete(entry);
    };

    const confirmDelete = async () => {
      if (!pendingDelete) return;
      const entry = pendingDelete;
      setPendingDelete(null);

      await galleryDbService.deleteEntry(entry.productName, entry.fileName);
      await refresh();
      setExpandedProducts((current) => {
        const remainingProducts = new Set(entries.filter(
          (e) => !(e.productName === entry.productName && e.fileName === entry.fileName)
        ).map((e) => e.productName));
        return current.filter((name) => remainingProducts.has(name));
      });
    };

    const handleRename = (entry: ContentGalleryEntry) => {
      setRenamingEntry({ productName: entry.productName, fileName: entry.fileName });
      setRenameValues({ folderPath: entry.productName, fileName: entry.fileName });
    };

    const confirmRename = async () => {
      if (!renamingEntry) return;
      const newFolder = renameValues.folderPath.trim();
      const newFile = renameValues.fileName.trim();
      if (!newFolder || !newFile) return;
      if (newFolder === renamingEntry.productName && newFile === renamingEntry.fileName) {
        setRenamingEntry(null);
        return;
      }
      // Load old entry, delete it, save with new path
      const oldEntry = entries.find(
        (e) => e.productName === renamingEntry.productName && e.fileName === renamingEntry.fileName
      );
      if (!oldEntry) return;
      await galleryDbService.deleteEntry(renamingEntry.productName, renamingEntry.fileName);
      const updatedEntry: ContentGalleryEntry = { ...oldEntry, productName: newFolder, fileName: newFile };
      await galleryDbService.saveEntry(updatedEntry);
      setRenamingEntry(null);
      await refresh();
    };

    const saveDialogRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      if (saveRequest && saveDialogRef.current) {
        saveDialogRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, [saveRequest]);

    return (
      <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {saveRequest ? (
          <div ref={saveDialogRef} style={{ border: '1px solid #0078d4', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#dce6f0', color: '#323130', fontWeight: 600, padding: '10px 16px' }}>
              Save to Saved Email Creatives
            </div>
            <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span>Folder path</span>
                <datalist id="folder-path-suggestions">
                  {productNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
                <input
                  list="folder-path-suggestions"
                  value={productName}
                  onChange={(event) => setProductName(event.target.value)}
                  placeholder="e.g., Xbox/newsletters/2026/May"
                  style={inputStyle}
                />
                {productNames.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                    {productNames.map((path) => (
                      <button
                        key={path}
                        type="button"
                        onClick={() => setProductName(path)}
                        style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: 12,
                          border: '1px solid #c8c6c4',
                          backgroundColor: productName === path ? '#0078d4' : '#f3f2f1',
                          color: productName === path ? '#ffffff' : '#323130',
                          cursor: 'pointer',
                        }}
                      >
                        {path}
                      </button>
                    ))}
                  </div>
                ) : null}
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span>File name</span>
                <input value={fileName} onChange={(event) => setFileName(event.target.value)} style={inputStyle} placeholder="e.g., Newsletter" />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span>Locale</span>
                <input value={locale} onChange={(event) => setLocale(event.target.value)} style={inputStyle} placeholder="e.g., en-US" />
              </label>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" style={primaryButtonStyle} onClick={() => void handleSave()}>
                  Save
                </button>
                <button type="button" style={baseButtonStyle} onClick={closeDialog}>
                  Cancel
                </button>
              </div>

              {saveError ? (
                <div style={{ gridColumn: '1 / -1', color: '#a4262c', fontSize: 13 }}>{saveError}</div>
              ) : null}
            </div>
          </div>
        ) : null}

        {entries.length === 0 ? (
          <div style={{ color: '#605e5c' }}>No content saved yet.</div>
        ) : (
          <FolderTreeView
            node={folderTree}
            expandedPaths={expandedProducts}
            onToggle={toggleProduct}
            onOpen={onOpen}
            onDelete={handleDelete}
            onRename={handleRename}
            renamingEntry={renamingEntry}
            renameValues={renameValues}
            onRenameChange={(field, value) => setRenameValues((prev) => ({ ...prev, [field]: value }))}
            onRenameConfirm={() => void confirmRename()}
            onRenameCancel={() => setRenamingEntry(null)}
            depth={-1}
          />
        )}
      </div>
      <ConfirmationDialog
        hidden={!pendingDelete}
        title="Delete content"
        subText={pendingDelete ? `Delete "${pendingDelete.productName} / ${pendingDelete.fileName}"? This cannot be undone.` : ''}
        primaryButtonText="Delete"
        secondaryButtonText="Cancel"
        onConfirm={() => void confirmDelete()}
        onDismiss={() => setPendingDelete(null)}
      />
      </>
    );
  }
);

ContentGallery.displayName = 'ContentGallery';
