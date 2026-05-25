import React from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { TabList, Tab, SelectTabEvent, SelectTabData } from '@fluentui/react-components';
import { ArrowLeftRegular } from '@fluentui/react-icons';
import { Create } from '../Create/Create';
import { Localize } from '../Localize/Localize';
import { HowTo } from '../HowTo/HowTo';

type EditorTab = 'create' | 'export' | 'howto';

export const Editor: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const { contentId } = useParams<{ contentId?: string }>();

  // Determine active tab from URL path
  const getTabFromPath = (): EditorTab => {
    const path = location.pathname;
    if (path.endsWith('/export')) return 'export';
    if (path.endsWith('/howto')) return 'howto';
    return 'create';
  };

  const [activeTab, setActiveTab] = React.useState<EditorTab>(getTabFromPath());
  const [commentEntityId, setCommentEntityId] = React.useState('');
  const [isPublished, setIsPublished] = React.useState(false);

  // Sync tab from URL changes (e.g. browser back/forward)
  React.useEffect(() => {
    const newTab = getTabFromPath();
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for save events from Create to update the comment entity ID
  React.useEffect(() => {
    const handleSaved = (event: Event) => {
      const detail = (event as CustomEvent<{ contentId: string; displayName: string; isPublished?: boolean }>).detail;
      if (detail?.contentId) {
        setCommentEntityId(detail.contentId);
        // Update URL to include contentId so page reload returns to this document
        history.replace(`/creatives/email/create/${detail.contentId}`);
      }
      if (detail?.isPublished !== undefined) {
        setIsPublished(detail.isPublished);
      }
    };
    const handlePublishChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ isPublished: boolean }>).detail;
      setIsPublished(detail.isPublished);
    };
    window.addEventListener('emailEditor:saved', handleSaved);
    window.addEventListener('emailEditor:publishChanged', handlePublishChanged);

    const raw = sessionStorage.getItem('emailEditor:commentEntityId');
    if (raw) setCommentEntityId(raw);
    const pub = sessionStorage.getItem('emailEditor:isPublished');
    if (pub === 'true') setIsPublished(true);

    return () => {
      window.removeEventListener('emailEditor:saved', handleSaved);
      window.removeEventListener('emailEditor:publishChanged', handlePublishChanged);
    };
  }, []);

  const handleTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    const newTab = data.value as EditorTab;
    setActiveTab(newTab);
    if (newTab === 'create') {
      const currentContentId = contentId || commentEntityId;
      history.replace(currentContentId ? `/creatives/email/create/${currentContentId}` : '/creatives/email/create');
    } else {
      history.replace(`/creatives/email/${newTab}`);
    }
  };

  const handleBack = () => {
    history.push('/creatives/email');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Editor header with back button and tabs */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, backgroundColor: '#fff' }}>
        <button
          type="button"
          onClick={handleBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            border: 'none',
            background: 'none',
            color: '#0078d4',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            padding: '8px 0',
          }}
        >
          <ArrowLeftRegular style={{ fontSize: 16 }} /> Gallery
        </button>
        <div style={{ width: 1, height: 24, backgroundColor: '#edebe9' }} />
        <TabList selectedValue={activeTab} onTabSelect={handleTabSelect} size="medium">
          <Tab value="create">Create</Tab>
          <Tab value="export">Export</Tab>
          <Tab value="howto">How To</Tab>
        </TabList>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ height: '100%', overflow: 'auto' }}>
          {activeTab === 'create' && <Create contentIdFromUrl={contentId} />}
          {activeTab === 'export' && <Localize />}
          {activeTab === 'howto' && <HowTo />}
        </div>
      </div>
    </div>
  );
};
