import React from 'react';

export const VisualEditor: React.FC = () => {
  return (
    <div
      contentEditable
      suppressContentEditableWarning
      style={{
        border: '2px dashed #c8c6c4',
        borderRadius: 4,
        minHeight: 400,
        padding: 20,
        fontSize: 14,
        lineHeight: 1.6,
        outline: 'none',
      }}
    >
      <p style={{ color: '#666', fontStyle: 'italic' }}>
        Visual editor will be integrated here. Start typing or paste your content...
      </p>
    </div>
  );
};
