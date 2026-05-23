import React from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbButton, BreadcrumbDivider } from '@fluentui/react-components';
import { useLocation, useHistory } from 'react-router-dom';
import styles from './Header.module.css';

const getPageName = (pathname: string): string => {
  if (pathname.startsWith('/creatives/email/create')) return 'Create';
  if (pathname.startsWith('/creatives/email/export')) return 'Export';
  if (pathname.startsWith('/creatives/email/howto')) return 'How To';
  return 'Gallery';
};

export const Header: React.FC = () => {
  const location = useLocation();
  const history = useHistory();
  const currentPage = getPageName(location.pathname);

  return (
    <div className={styles.header}>
      <span className={styles.title}>Iris Studio</span>
      <Breadcrumb size="medium">
        <BreadcrumbItem>
          <BreadcrumbButton onClick={() => history.push('/creatives/email')} style={{ color: 'white', fontWeight: 400, cursor: 'pointer' }}>Creatives</BreadcrumbButton>
        </BreadcrumbItem>
        <BreadcrumbDivider style={{ color: 'rgba(255,255,255,0.7)' }} />
        <BreadcrumbItem>
          <BreadcrumbButton onClick={() => history.push('/creatives/email')} style={{ color: 'white', fontWeight: 400, cursor: 'pointer' }}>Email Creatives</BreadcrumbButton>
        </BreadcrumbItem>
        <BreadcrumbDivider style={{ color: 'rgba(255,255,255,0.7)' }} />
        <BreadcrumbItem>
          <BreadcrumbButton current style={{ color: 'white', fontWeight: 600 }}>{currentPage}</BreadcrumbButton>
        </BreadcrumbItem>
      </Breadcrumb>
    </div>
  );
};
