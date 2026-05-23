import React from 'react';
import { TabList, Tab, SelectTabEvent, SelectTabData } from '@fluentui/react-components';
import { useHistory, useLocation } from 'react-router-dom';

const tabs = [
  { key: '/creatives/email', text: 'Gallery' },
  { key: '/creatives/email/create', text: 'Create' },
  { key: '/creatives/email/export', text: 'Export' },
  { key: '/creatives/email/howto', text: 'How To' },
];

export const TabNav: React.FC = () => {
  const history = useHistory();
  const location = useLocation();

  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.startsWith('/creatives/email/create')) return '/creatives/email/create';
    if (path.startsWith('/creatives/email/export')) return '/creatives/email/export';
    if (path.startsWith('/creatives/email/howto')) return '/creatives/email/howto';
    return '/creatives/email';
  };

  const selectedKey = getSelectedKey();

  const handleTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    if (data.value) {
      history.push(data.value as string);
    }
  };

  return (
    <div style={{ borderBottom: '1px solid #edebe9', paddingLeft: 16 }}>
      <TabList selectedValue={selectedKey} onTabSelect={handleTabSelect} size="medium">
        {tabs.map((tab) => (
          <Tab key={tab.key} value={tab.key}>
            {tab.text}
          </Tab>
        ))}
      </TabList>
    </div>
  );
};
