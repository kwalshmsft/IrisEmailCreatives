import React from 'react';
import { useHistory } from 'react-router-dom';
import { ContentGalleryEntry, galleryDbService, CONTENT_TAXONOMY } from '../../services/galleryDbService';
import { DocumentAdd20Regular, ArrowUpload20Regular, DismissRegular, FilterRegular, DeleteRegular } from '@fluentui/react-icons';
import ConfirmationDialog from '../../components/ConfirmationDialog/ConfirmationDialog';

type SortField = 'name' | 'product' | 'updatedBy' | 'lastUpdated' | 'status';
type SortDirection = 'asc' | 'desc';

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
    fontSize: 18,
    fontWeight: 600,
    color: '#323130',
  },
  subtitle: {
    margin: '4px 0 0 0',
    color: '#605e5c',
    fontSize: 13,
    fontWeight: 400,
    lineHeight: 1.5,
  },
  card: {
    borderRadius: 4,
    boxShadow: '0 1.6px 3.6px 0 rgba(0,0,0,0.132), 0 0.3px 0.9px 0 rgba(0,0,0,0.108)',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  filterBar: {
    padding: '12px 16px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  filterButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    border: '1px solid #8a8886',
    borderRadius: 4,
    backgroundColor: '#ffffff',
    color: '#323130',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px',
    borderRadius: 4,
    backgroundColor: '#eff6fc',
    color: '#0078d4',
    fontSize: 13,
    border: 'none',
    cursor: 'pointer',
  },
  chipDismiss: {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    color: '#0078d4',
    display: 'inline-flex',
    alignItems: 'center',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '10px 16px',
    borderBottom: '1px solid #e1dfdd',
    fontWeight: 600,
    fontSize: 13,
    color: '#323130',
    cursor: 'pointer',
    userSelect: 'none',
  },
  td: {
    padding: '12px 16px',
    borderBottom: '1px solid #f3f2f1',
    verticalAlign: 'top',
    fontSize: 14,
  },
  nameLink: {
    color: '#0078d4',
    textDecoration: 'none',
    cursor: 'pointer',
    fontWeight: 500,
  },
  subText: {
    color: '#605e5c',
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 500,
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px 16px',
    color: '#605e5c',
  },
  filterDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 4,
    backgroundColor: '#ffffff',
    border: '1px solid #e1dfdd',
    borderRadius: 4,
    boxShadow: '0 3.2px 7.2px 0 rgba(0,0,0,0.132), 0 0.6px 1.8px 0 rgba(0,0,0,0.108)',
    padding: 12,
    zIndex: 100,
    minWidth: 200,
  },
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(new Date(value));

const getStatusStyle = (status: string): React.CSSProperties => {
  if (status === 'Published') {
    return { ...pageStyles.statusBadge, backgroundColor: '#dff6dd', color: '#107c10' };
  }
  if (status === 'Draft') {
    return { ...pageStyles.statusBadge, backgroundColor: '#f3f2f1', color: '#605e5c' };
  }
  return { ...pageStyles.statusBadge, backgroundColor: '#fff4ce', color: '#8a6d00' };
};

const getEntryStatus = (entry: ContentGalleryEntry): string =>
  entry.published ? 'Published' : 'Draft';

export const Gallery: React.FC = () => {
  const history = useHistory();
  const [entries, setEntries] = React.useState<ContentGalleryEntry[]>([]);
  const [sortField, setSortField] = React.useState<SortField>('lastUpdated');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');
  const [filterStatus, setFilterStatus] = React.useState<string | null>(null);
  const [showFilterPanel, setShowFilterPanel] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ContentGalleryEntry | null>(null);
  const filterRef = React.useRef<HTMLDivElement>(null);
  const uploadInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    galleryDbService.getAllEntries().then(setEntries);
  }, []);

  // Close filter dropdown on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredEntries = React.useMemo(() => {
    let result = entries;
    if (filterStatus) {
      result = result.filter((e) => getEntryStatus(e) === filterStatus);
    }
    return result;
  }, [entries, filterStatus]);

  const sortedEntries = React.useMemo(() => {
    const sorted = [...filteredEntries];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.displayName.localeCompare(b.displayName);
          break;
        case 'product':
          cmp = a.surfaceName.localeCompare(b.surfaceName);
          break;
        case 'updatedBy':
          cmp = (a.updatedBy || '').localeCompare(b.updatedBy || '');
          break;
        case 'lastUpdated':
          cmp = new Date(a.lastModifiedUtc).getTime() - new Date(b.lastModifiedUtc).getTime();
          break;
        case 'status':
          cmp = getEntryStatus(a).localeCompare(getEntryStatus(b));
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredEntries, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'lastUpdated' ? 'desc' : 'asc');
    }
  };

  const handleOpen = (entry: ContentGalleryEntry) => {
    sessionStorage.setItem('emailEditor:openEntry', JSON.stringify(entry));
    history.push(`/creatives/email/create/${entry.contentId}`);
  };

  const handleDelete = (entry: ContentGalleryEntry) => {
    setDeleteTarget(entry);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await galleryDbService.deleteEntry(deleteTarget.contentId);
    setEntries((prev) => prev.filter((e) => e.contentId !== deleteTarget.contentId));
    setDeleteTarget(null);
  };

  const handleNewCreative = () => {
    history.push('/creatives/email/create');
  };

  const handleUploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';

    const html = await file.text();
    sessionStorage.setItem('emailEditor:openEntry', JSON.stringify({
      contentId: '',
      productCategory: CONTENT_TAXONOMY.productCategory,
      productSubcategory: CONTENT_TAXONOMY.productSubcategory,
      surfaceName: CONTENT_TAXONOMY.surfaceName,
      displayName: file.name.replace(/\.html?$/i, ''),
      htmlContent: html,
      sourceType: 'html',
      lastModifiedUtc: new Date().toISOString(),
    }));
    history.push('/creatives/email/create');
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return <span style={{ marginLeft: 4 }}>{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  const hasFilters = !!filterStatus;

  return (
    <div style={pageStyles.page}>
      <div>
        <h2 style={pageStyles.title}>Email Creatives</h2>
        <p style={pageStyles.subtitle}>
          Create email creatives using existing HTML files or from previous creatives.
        </p>
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '12px 16px', border: '1px solid #e1dfdd', borderRadius: 4, backgroundColor: '#ffffff' }}>
        <button
          type="button"
          onClick={handleNewCreative}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', color: '#0078d4', cursor: 'pointer', fontSize: 14, fontWeight: 400, padding: 0 }}
        >
          <DocumentAdd20Regular /> New Email
        </button>
        <button
          type="button"
          onClick={() => uploadInputRef.current?.click()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', color: '#0078d4', cursor: 'pointer', fontSize: 14, fontWeight: 400, padding: 0 }}
        >
          <ArrowUpload20Regular /> Upload HTML
        </button>
      </div>
      <input
        ref={uploadInputRef}
        type="file"
        accept=".html,.htm"
        style={{ display: 'none' }}
        onChange={handleUploadFile}
      />

      <div style={pageStyles.card}>
        {/* Filter bar */}
        <div style={pageStyles.filterBar}>
          <div style={{ position: 'relative' }} ref={filterRef}>
            <button
              type="button"
              style={pageStyles.filterButton}
              onClick={() => setShowFilterPanel(!showFilterPanel)}
            >
              <FilterRegular style={{ fontSize: 14 }} /> Filters
            </button>
            {showFilterPanel && (
              <div style={pageStyles.filterDropdown}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#323130' }}>Status</label>
                  <select
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid #8a8886', fontSize: 13 }}
                    value={filterStatus || ''}
                    onChange={(e) => { setFilterStatus(e.target.value || null); setShowFilterPanel(false); }}
                  >
                    <option value="">All statuses</option>
                    <option value="Published">Published</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {hasFilters && (
            <>
              <span style={{ fontSize: 13, color: '#605e5c' }}>filtered by</span>
              {filterStatus && (
                <span style={pageStyles.chip}>
                  {filterStatus}
                  <button type="button" style={pageStyles.chipDismiss} onClick={() => setFilterStatus(null)} aria-label="Remove status filter">
                    <DismissRegular style={{ fontSize: 12 }} />
                  </button>
                </span>
              )}
            </>
          )}
        </div>

        {/* Table */}
        {sortedEntries.length > 0 ? (
          <table style={pageStyles.table}>
            <thead>
              <tr>
                <th style={pageStyles.th} onClick={() => handleSort('name')}>
                  Name{renderSortIndicator('name')}
                </th>
                <th style={pageStyles.th} onClick={() => handleSort('product')}>
                  Surface{renderSortIndicator('product')}
                </th>
                <th style={pageStyles.th} onClick={() => handleSort('updatedBy')}>
                  Updated By{renderSortIndicator('updatedBy')}
                </th>
                <th style={pageStyles.th} onClick={() => handleSort('lastUpdated')}>
                  Last updated on{renderSortIndicator('lastUpdated')}
                </th>
                <th style={pageStyles.th} onClick={() => handleSort('status')}>
                  Status{renderSortIndicator('status')}
                </th>
                <th style={{ ...pageStyles.th, width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry) => (
                <tr key={entry.contentId} style={{ cursor: 'pointer' }} onClick={() => handleOpen(entry)}>
                  <td style={pageStyles.td}>
                    <span style={pageStyles.nameLink}>{entry.displayName}</span>
                    <div style={pageStyles.subText}>ID: {entry.contentId}</div>
                  </td>
                  <td style={pageStyles.td}>{entry.surfaceName}</td>
                  <td style={pageStyles.td}>{entry.updatedBy || '—'}</td>
                  <td style={pageStyles.td}>{formatDate(entry.lastModifiedUtc)}</td>
                  <td style={pageStyles.td}>
                    <span style={getStatusStyle(getEntryStatus(entry))}>{getEntryStatus(entry)}</span>
                  </td>
                  <td style={pageStyles.td}>
                    <button
                      type="button"
                      title="Delete"
                      onClick={(e) => { e.stopPropagation(); handleDelete(entry); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a4262c', padding: 4, display: 'inline-flex' }}
                    >
                      <DeleteRegular />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={pageStyles.emptyState}>
            <p style={{ fontSize: 16, marginBottom: 4 }}>No creatives found</p>
            <p style={{ margin: 0 }}>
              {hasFilters ? 'Try adjusting your filters.' : 'Click "+ New Creative" to create your first email creative.'}
            </p>
          </div>
        )}
      </div>
      <ConfirmationDialog
        hidden={!deleteTarget}
        title="Delete creative"
        subText={`Delete "${deleteTarget?.displayName}"? This cannot be undone.`}
        primaryButtonText="Delete"
        onConfirm={() => void confirmDelete()}
        onDismiss={() => setDeleteTarget(null)}
      />
    </div>
  );
};
