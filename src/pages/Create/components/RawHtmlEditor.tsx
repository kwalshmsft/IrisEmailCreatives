import React, { useState } from 'react';
import { Button } from '@fluentui/react-components';

export const RawHtmlEditor: React.FC = () => {
  const [html, setHtml] = useState('<html>\n  <body>\n    <h1>Hello World</h1>\n  </body>\n</html>');

  const handleCopy = () => {
    navigator.clipboard.writeText(html);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button appearance="secondary" onClick={handleCopy}>Copy</Button>
      </div>
      <textarea
        value={html}
        onChange={(e) => setHtml(e.target.value)}
        style={{
          width: '100%',
          minHeight: 400,
          fontFamily: 'Consolas, monospace',
          fontSize: 13,
          padding: 12,
          border: '1px solid #8a8886',
          borderRadius: 4,
          resize: 'vertical',
        }}
      />
    </div>
  );
};
