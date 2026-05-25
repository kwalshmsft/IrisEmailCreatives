import React from 'react';
import { HashRouter, Switch, Route, Redirect, useLocation } from 'react-router-dom';
import { Gallery } from './pages/Gallery/Gallery';
import { Editor } from './pages/Editor/Editor';
import { IrisShell } from './components/IrisShell/IrisShell';
import './App.css';

const isEmbedded = window.self !== window.top;

const PageChangeNotifier: React.FC = () => {
  const location = useLocation();

  React.useEffect(() => {
    if (isEmbedded) {
      const page = location.pathname === '/' ? '/creatives/email' : location.pathname;
      window.parent.postMessage({ type: 'emailEditor:pageChanged', page }, '*');
    }
  }, [location.pathname]);

  return null;
};

const AppShell: React.FC = () => {
  const content = (
    <>
      <PageChangeNotifier />
      <div className="page-content">
        <Switch>
          <Route path="/creatives/email/export" component={Editor} />
          <Route path="/creatives/email/howto" component={Editor} />
          <Route path="/creatives/email/create/:contentId" component={Editor} />
          <Route exact path="/creatives/email/create" component={Editor} />
          <Route exact path="/creatives/email" component={Gallery} />
          {/* Legacy route redirects */}
          <Route path="/gallery"><Redirect to="/creatives/email" /></Route>
          <Route path="/editor"><Redirect to="/creatives/email/create" /></Route>
          <Redirect to="/creatives/email" />
        </Switch>
      </div>
    </>
  );

  if (isEmbedded) return content;
  return <IrisShell>{content}</IrisShell>;
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  );
};

export default App;
