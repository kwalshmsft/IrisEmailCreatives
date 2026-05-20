import React from 'react';
import { Toolbar, ToolbarButton } from '@fluentui/react-components';
import { TextBoldRegular, TextItalicRegular, TextUnderlineRegular, LinkRegular, ColorRegular, HighlightRegular } from '@fluentui/react-icons';

export const EditorToolbar: React.FC = () => {
  return (
    <Toolbar style={{ marginBottom: 8, borderBottom: '1px solid #edebe9' }}>
      <ToolbarButton icon={<TextBoldRegular />} aria-label="Bold" />
      <ToolbarButton icon={<TextItalicRegular />} aria-label="Italic" />
      <ToolbarButton icon={<TextUnderlineRegular />} aria-label="Underline" />
      <ToolbarButton icon={<LinkRegular />} aria-label="Link" />
      <ToolbarButton icon={<ColorRegular />} aria-label="Text Color" />
      <ToolbarButton icon={<HighlightRegular />} aria-label="Highlight" />
    </Toolbar>
  );
};
