import React from 'react';
import {
  HomeRegular,
  NavigationRegular,
  MapRegular,
  PeopleAudienceRegular,
  DocumentMultipleRegular,
  GlobeRegular,
  DataBarVerticalRegular,
  PersonRegular,
  AlertRegular,
} from '@fluentui/react-icons';

const HEADER_HEIGHT = 48;
const SIDEBAR_WIDTH = 220;
const SIDEBAR_COLLAPSED_WIDTH = 50;

interface IrisShellProps {
  children: React.ReactNode;
}

const navItems = [
  { icon: <HomeRegular />, label: 'Home' },
  { icon: <MapRegular />, label: 'Campaigns' },
  { icon: <PeopleAudienceRegular />, label: 'Segments' },
  { icon: <DocumentMultipleRegular />, label: 'Creatives', active: true },
  { icon: <GlobeRegular />, label: 'Surfaces' },
  { icon: <DataBarVerticalRegular />, label: 'Insights' },
];

export const IrisShell: React.FC<IrisShellProps> = ({ children }) => {
  const [collapsed, setCollapsed] = React.useState(false);
  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f8' }}>
      {/* Header */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: HEADER_HEIGHT,
        backgroundColor: '#0078d4',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        boxSizing: 'border-box',
      }}>
        <span style={{
          fontSize: 20,
          color: '#fff',
          fontFamily: 'Segoe UI Semibold, Segoe UI, sans-serif',
          paddingLeft: 8,
          minWidth: SIDEBAR_WIDTH - 40,
        }}>
          Iris Studio
        </span>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <AlertRegular style={{ fontSize: 20, color: '#fff', cursor: 'pointer' }} />
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}>
            <PersonRegular style={{ fontSize: 18, color: '#fff' }} />
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: sidebarWidth,
        height: '100%',
        backgroundColor: '#fff',
        paddingTop: HEADER_HEIGHT + 10,
        boxShadow: '0px 1.6px 3.6px 0px rgba(0,0,0,0.13), 0px 0.3px 0.9px 0px rgba(0,0,0,0.1)',
        zIndex: 1000,
        transition: 'width 0.2s ease',
        overflow: 'hidden',
      }}>
        {/* Collapse toggle */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            width: '100%',
            padding: '10px 14px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: '#323130',
            fontSize: 14,
          }}
        >
          <NavigationRegular style={{ fontSize: 20, flexShrink: 0 }} />
        </button>

        {/* Nav items */}
        {navItems.map((item) => (
          <button
            key={item.label}
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '10px 14px',
              border: 'none',
              background: item.active ? '#f3f2f1' : 'none',
              cursor: 'pointer',
              color: item.active ? '#0078d4' : '#323130',
              fontSize: 14,
              fontWeight: item.active ? 600 : 400,
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 20, flexShrink: 0, display: 'flex' }}>{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Main content area */}
      <main style={{
        marginLeft: sidebarWidth,
        marginTop: HEADER_HEIGHT,
        transition: 'margin-left 0.2s ease',
        minHeight: `calc(100vh - ${HEADER_HEIGHT}px)`,
      }}>
        {children}
      </main>
    </div>
  );
};
