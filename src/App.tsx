import React from 'react';
import { HashRouter, Switch, Route, Redirect, useLocation } from 'react-router-dom';
import { Gallery } from './pages/Gallery/Gallery';
import { Editor } from './pages/Editor/Editor';
import './App.css';

const isEmbedded = window.self !== window.top;

const PageChangeNotifier: React.FC = () => {
  const location = useLocation();

  React.useEffect(() => {
    if (isEmbedded) {
      const page = location.pathname === '/' ? '/gallery' : location.pathname;
      window.parent.postMessage({ type: 'emailEditor:pageChanged', page }, '*');
    }
  }, [location.pathname]);

  return null;
};

const AppShell: React.FC = () => {
  return (
    <>
      <PageChangeNotifier />
      <div className="page-content">
        <Switch>
          <Route exact path="/" component={Gallery} />
          <Route path="/gallery" component={Gallery} />
          <Route path="/editor" component={Editor} />
          <Redirect to="/" />
        </Switch>
      </div>
    </>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  );
};

export default App;
