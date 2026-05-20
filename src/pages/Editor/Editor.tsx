import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { TabList, Tab, SelectTabEvent, SelectTabData } from '@fluentui/react-components';
import { ArrowLeftRegular } from '@fluentui/react-icons';
import { Create } from '../Create/Create';
import { Localize } from '../Localize/Localize';
import { HowTo } from '../HowTo/HowTo';
import { ContentGalleryEntry } from '../../services/galleryDbService';

type EditorTab = 'create' | 'localize' | 'howto';

export const Editor: React.FC = () => {
  const history = useHistory();
  const location = useLocation<{ openEntry?: ContentGalleryEntry }>();
  const [activeTab, setActiveTab] = React.useState<EditorTab>('create');

  const handleTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    setActiveTab(data.value as EditorTab);
  };

  const handleBack = () => {
    history.push('/gallery');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Editor header with back button and tabs */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #edebe9', padding: '0 16px', gap: 12, backgroundColor: '#fff' }}>
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
          <Tab value="localize">Localize</Tab>
          <Tab value="howto">How To</Tab>
        </TabList>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'create' && <Create />}
        {activeTab === 'localize' && <Localize />}
        {activeTab === 'howto' && <HowTo />}
      </div>
    </div>
  );
};
