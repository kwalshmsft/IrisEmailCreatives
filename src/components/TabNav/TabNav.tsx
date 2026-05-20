import React from 'react';
import { TabList, Tab, SelectTabEvent, SelectTabData } from '@fluentui/react-components';
import { useHistory, useLocation } from 'react-router-dom';

const tabs = [
  { key: '/gallery', text: 'Gallery' },
  { key: '/create', text: 'Create' },
  { key: '/localize', text: 'Localize' },
  // { key: '/render', text: 'Render' }, // Hidden until operational
  { key: '/howto', text: 'How To' },
];

export const TabNav: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const selectedKey = location.pathname === '/' ? '/gallery' : location.pathname;

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
