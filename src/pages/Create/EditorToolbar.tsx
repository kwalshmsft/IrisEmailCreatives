import React from 'react';
import { BracesVariableRegular } from '@fluentui/react-icons';

interface EditorToolbarProps {
  onSaveSelection: () => void;
  onExec: (command: string, value?: string) => void;
  onApplyColor: (command: 'foreColor' | 'hiliteColor', value: string) => void;
  onClearHighlight: () => void;
  onInsertText: (text: string) => void;
  onOpenLinkEditor: () => void;
  onInsertImage: () => void;
  onWrapVisibility: (className: 'mobile-only' | 'desktop-only') => void;
  onToggleVisibility: () => void;
  showVisibility: boolean;
}

interface ColorSwatch {
  name: string;
  hex: string;
}

const textSwatches: ColorSwatch[] = [
  { name: 'Black', hex: '#000000' },
  { name: 'Dark Gray', hex: '#555555' },
  { name: 'Gray', hex: '#888888' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Red', hex: '#d13438' },
  { name: 'Dark Red', hex: '#a4262c' },
  { name: 'Orange', hex: '#ca5010' },
  { name: 'Yellow', hex: '#fce100' },
  { name: 'Green', hex: '#107c10' },
  { name: 'Teal', hex: '#038387' },
  { name: 'Blue', hex: '#0078d4' },
  { name: 'Dark Blue', hex: '#002050' },
  { name: 'Purple', hex: '#8764b8' },
  { name: 'Magenta', hex: '#881798' },
  { name: 'Pink', hex: '#e3008c' },
  { name: 'Brown', hex: '#8e562e' },
];

const highlightSwatches: ColorSwatch[] = [
  { name: 'Yellow', hex: '#fff100' },
  { name: 'Light Green', hex: '#92d050' },
  { name: 'Light Blue', hex: '#00b0f0' },
  { name: 'Pink', hex: '#ffc0cb' },
  { name: 'Light Orange', hex: '#ffd966' },
  { name: 'Lavender', hex: '#d5a6e6' },
  { name: 'Light Gray', hex: '#d9d9d9' },
  { name: 'White', hex: '#ffffff' },
];

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  padding: 10,
  marginBottom: 12,
  backgroundColor: '#f3f2f1',
  border: '1px solid #e1dfdd',
  borderRadius: 4,
  position: 'relative',
};

const groupStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flexWrap: 'wrap',
};

const buttonStyle: React.CSSProperties = {
  borderRadius: 4,
  padding: '4px 10px',
  border: '1px solid #8a8886',
  backgroundColor: '#ffffff',
  color: '#323130',
  cursor: 'pointer',
  fontSize: 13,
  height: 28,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const activeButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  borderColor: '#ffb900',
  backgroundColor: '#fff4ce',
};

const menuStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 4px)',
  left: 0,
  zIndex: 20,
  backgroundColor: '#ffffff',
  border: '1px solid #d1d1d1',
  borderRadius: 4,
  boxShadow: '0 1.6px 3.6px 0 rgba(0,0,0,0.132), 0 0.3px 0.9px 0 rgba(0,0,0,0.108)',
  padding: 8,
  minWidth: 188,
};

const swatchGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 6,
};

const swatchButtonStyle = (color: string): React.CSSProperties => ({
  width: 30,
  height: 30,
  borderRadius: 4,
  border: color.toLowerCase() === '#ffffff' ? '1px solid #8a8886' : '1px solid transparent',
  backgroundColor: color,
  cursor: 'pointer',
});

const variableButtonStyle: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  padding: '6px 8px',
  border: 'none',
  backgroundColor: '#ffffff',
  cursor: 'pointer',
  fontSize: 13,
};

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onSaveSelection,
  onExec,
  onApplyColor,
  onClearHighlight,
  onInsertText,
  onOpenLinkEditor,
  onInsertImage,
  onWrapVisibility,
  onToggleVisibility,
  showVisibility,
}) => {
  const [openMenu, setOpenMenu] = React.useState<'text' | 'highlight' | 'variable' | null>(null);
  const [customTextColor, setCustomTextColor] = React.useState('#000000');
  const [customHighlightColor, setCustomHighlightColor] = React.useState('#fff100');
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const preserveSelection = (event?: React.MouseEvent<HTMLElement>) => {
    event?.preventDefault();
    onSaveSelection();
  };

  const renderColorMenu = (kind: 'text' | 'highlight') => {
    const isText = kind === 'text';
    const swatches = isText ? textSwatches : highlightSwatches;

    return (
      <div style={menuStyle}>
        <div style={swatchGridStyle}>
          {swatches.map((swatch) => (
            <button
              key={swatch.hex}
              type="button"
              title={swatch.name}
              style={swatchButtonStyle(swatch.hex)}
              onMouseDown={preserveSelection}
              onClick={() => {
                setOpenMenu(null);
                if (isText) {
                  setCustomTextColor(swatch.hex);
                  onApplyColor('foreColor', swatch.hex);
                } else {
                  setCustomHighlightColor(swatch.hex);
                  onApplyColor('hiliteColor', swatch.hex);
                }
              }}
            />
          ))}
        </div>
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #edebe9', display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="color"
            value={isText ? customTextColor : customHighlightColor}
            onMouseDown={preserveSelection}
            onChange={(event) => {
              const nextColor = event.target.value;
              setOpenMenu(null);
              if (isText) {
                setCustomTextColor(nextColor);
                onApplyColor('foreColor', nextColor);
              } else {
                setCustomHighlightColor(nextColor);
                onApplyColor('hiliteColor', nextColor);
              }
            }}
          />
          <span style={{ color: '#605e5c', fontSize: 12 }}>Custom color</span>
        </div>
        {!isText ? (
          <button
            type="button"
            style={{ ...buttonStyle, width: '100%', marginTop: 8 }}
            onMouseDown={preserveSelection}
            onClick={() => {
              setOpenMenu(null);
              onClearHighlight();
            }}
          >
            Remove highlight
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <div style={toolbarStyle} ref={rootRef}>
      <div style={groupStyle}>
        <button type="button" style={buttonStyle} onMouseDown={preserveSelection} onClick={() => onExec('bold')}>
          <strong>B</strong>
        </button>
        <button type="button" style={buttonStyle} onMouseDown={preserveSelection} onClick={() => onExec('italic')}>
          <em>I</em>
        </button>
        <button type="button" style={buttonStyle} onMouseDown={preserveSelection} onClick={() => onExec('underline')}>
          <u>U</u>
        </button>
      </div>

      <div style={groupStyle}>
        <button type="button" style={buttonStyle} onMouseDown={preserveSelection} onClick={() => onExec('fontSize', 'increase')} title="Increase font size">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M13.854 4.854a.5.5 0 01-.708-.708l2-2a.5.5 0 01.708 0l2 2a.5.5 0 01-.708.708L15.5 3.207l-1.646 1.647zM10 4a.5.5 0 01.463.31l4.5 11a.5.5 0 11-.926.38L12.5 11.932V12H7.5v-.069L5.963 15.69a.5.5 0 11-.926-.38l4.5-11A.5.5 0 0110 4zm0 1.82L7.881 11h4.238L10 5.82z"/></svg>
        </button>
        <button type="button" style={buttonStyle} onMouseDown={preserveSelection} onClick={() => onExec('fontSize', 'decrease')} title="Decrease font size">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M13.146 2.146a.5.5 0 01.708 0L15.5 3.793l1.646-1.647a.5.5 0 01.708.708l-2 2a.5.5 0 01-.708 0l-2-2a.5.5 0 010-.708zM10 4a.5.5 0 01.463.31l4.5 11a.5.5 0 11-.926.38L12.5 11.932V12H7.5v-.069L5.963 15.69a.5.5 0 11-.926-.38l4.5-11A.5.5 0 0110 4zm0 1.82L7.881 11h4.238L10 5.82z"/></svg>
        </button>
      </div>

      <div style={{ ...groupStyle, position: 'relative' }}>
        <button
          type="button"
          style={buttonStyle}
          onMouseDown={preserveSelection}
          onClick={() => setOpenMenu((current) => (current === 'text' ? null : 'text'))}
        >
          Text Color
        </button>
        {openMenu === 'text' ? renderColorMenu('text') : null}
      </div>

      <div style={{ ...groupStyle, position: 'relative' }}>
        <button
          type="button"
          style={buttonStyle}
          onMouseDown={preserveSelection}
          onClick={() => setOpenMenu((current) => (current === 'highlight' ? null : 'highlight'))}
        >
          Highlight
        </button>
        {openMenu === 'highlight' ? renderColorMenu('highlight') : null}
      </div>

      <div style={groupStyle}>
        <button type="button" style={buttonStyle} onMouseDown={preserveSelection} onClick={() => onExec('justifyLeft')} title="Align left">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1 3.5C1 3.224 1.224 3 1.5 3H10.5C10.776 3 11 3.224 11 3.5C11 3.776 10.776 4 10.5 4H1.5C1.224 4 1 3.776 1 3.5ZM1 7.5C1 7.224 1.224 7 1.5 7H14.5C14.776 7 15 7.224 15 7.5C15 7.776 14.776 8 14.5 8H1.5C1.224 8 1 7.776 1 7.5ZM1 11.5C1 11.224 1.224 11 1.5 11H6.5C6.776 11 7 11.224 7 11.5C7 11.776 6.776 12 6.5 12H1.5C1.224 12 1 11.776 1 11.5Z"/></svg>
        </button>
        <button type="button" style={buttonStyle} onMouseDown={preserveSelection} onClick={() => onExec('justifyCenter')} title="Align center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 3.5C3 3.224 3.224 3 3.5 3H12.5C12.776 3 13 3.224 13 3.5C13 3.776 12.776 4 12.5 4H3.5C3.224 4 3 3.776 3 3.5ZM1 7.5C1 7.224 1.224 7 1.5 7H14.5C14.776 7 15 7.224 15 7.5C15 7.776 14.776 8 14.5 8H1.5C1.224 8 1 7.776 1 7.5ZM5 11.5C5 11.224 5.224 11 5.5 11H10.5C10.776 11 11 11.224 11 11.5C11 11.776 10.776 12 10.5 12H5.5C5.224 12 5 11.776 5 11.5Z"/></svg>
        </button>
        <button type="button" style={buttonStyle} onMouseDown={preserveSelection} onClick={() => onExec('justifyRight')} title="Align right">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M5 3.5C5 3.224 5.224 3 5.5 3H14.5C14.776 3 15 3.224 15 3.5C15 3.776 14.776 4 14.5 4H5.5C5.224 4 5 3.776 5 3.5ZM1 7.5C1 7.224 1.224 7 1.5 7H14.5C14.776 7 15 7.224 15 7.5C15 7.776 14.776 8 14.5 8H1.5C1.224 8 1 7.776 1 7.5ZM9 11.5C9 11.224 9.224 11 9.5 11H14.5C14.776 11 15 11.224 15 11.5C15 11.776 14.776 12 14.5 12H9.5C9.224 12 9 11.776 9 11.5Z"/></svg>
        </button>
      </div>

      <div style={groupStyle}>
        <button type="button" style={buttonStyle} onMouseDown={preserveSelection} onClick={onOpenLinkEditor} title="Insert link">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M9.5 4H10.5C12.433 4 14 5.567 14 7.5C14 9.369 12.536 10.895 10.694 10.995L10.502 11L9.502 11.005C9.226 11.006 9.001 10.783 9 10.507C8.999 10.261 9.175 10.057 9.408 10.013L9.498 10.005L10.5 10C11.881 10 13 8.881 13 7.5C13 6.175 11.969 5.09 10.664 5.005L10.5 5H9.5C9.224 5 9 4.776 9 4.5C9 4.255 9.177 4.05 9.41 4.008L9.5 4H10.5H9.5ZM5.5 4H6.5C6.776 4 7 4.224 7 4.5C7 4.745 6.823 4.95 6.59 4.992L6.5 5H5.5C4.119 5 3 6.119 3 7.5C3 8.825 4.032 9.91 5.336 9.995L5.5 10H6.5C6.776 10 7 10.224 7 10.5C7 10.745 6.823 10.95 6.59 10.992L6.5 11H5.5C3.567 11 2 9.433 2 7.5C2 5.631 3.464 4.105 5.308 4.005L5.5 4H6.5H5.5ZM5.5 7L10.5 7.002C10.776 7.002 11 7.226 11 7.503C11 7.748 10.823 7.952 10.59 7.994L10.5 8.002L5.5 8C5.224 8 5 7.776 5 7.5C5 7.254 5.177 7.05 5.41 7.008L5.5 7Z"/></svg>
        </button>
        <button type="button" style={buttonStyle} onMouseDown={preserveSelection} onClick={onInsertImage} title="Insert image">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M11.5 5.502C11.5 6.056 11.051 6.504 10.498 6.504C9.944 6.504 9.496 6.056 9.496 5.502C9.496 4.949 9.944 4.5 10.498 4.5C11.051 4.5 11.5 4.949 11.5 5.502ZM2 4.5C2 3.119 3.119 2 4.5 2H11.5C12.881 2 14 3.119 14 4.5V11.5C14 12.881 12.881 14 11.5 14H4.5C3.119 14 2 12.881 2 11.5V4.5ZM4.5 3C3.672 3 3 3.672 3 4.5V11.5C3 11.732 3.052 11.951 3.146 12.147L6.798 8.495C7.462 7.831 8.538 7.831 9.202 8.495L12.854 12.147C12.948 11.951 13 11.732 13 11.5V4.5C13 3.672 12.328 3 11.5 3H4.5ZM12.147 12.854L8.495 9.202C8.222 8.929 7.778 8.929 7.505 9.202L3.853 12.854C4.049 12.948 4.268 13 4.5 13H11.5C11.732 13 11.951 12.948 12.147 12.854Z"/></svg>
        </button>
        <button type="button" style={buttonStyle} onMouseDown={preserveSelection} onClick={() => onExec('insertHorizontalRule')} title="Insert horizontal rule">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M2 9.5C2 9.224 2.224 9 2.5 9H17.5C17.776 9 18 9.224 18 9.5C18 9.776 17.776 10 17.5 10H2.5C2.224 10 2 9.776 2 9.5Z"/></svg>
        </button>
      </div>

      <div style={{ ...groupStyle, position: 'relative' }}>
        <button
          type="button"
          style={buttonStyle}
          onMouseDown={preserveSelection}
          onClick={() => setOpenMenu((current) => (current === 'variable' ? null : 'variable'))}
          title="Insert a template variable like @Model or @Context"
        >
          <BracesVariableRegular style={{ marginRight: 4 }} /> Variables
        </button>
        {openMenu === 'variable' ? (
          <div style={{ ...menuStyle, minWidth: 280 }}>
            <button
              type="button"
              style={variableButtonStyle}
              onMouseDown={preserveSelection}
              onClick={() => {
                setOpenMenu(null);
                onInsertText('@Context.');
              }}
            >
              <code>@Context.</code>
            </button>
            <button
              type="button"
              style={variableButtonStyle}
              onMouseDown={preserveSelection}
              onClick={() => {
                setOpenMenu(null);
                onInsertText('@Culture.Name');
              }}
            >
              <code>@Culture.Name</code>
            </button>
            <button
              type="button"
              style={variableButtonStyle}
              onMouseDown={preserveSelection}
              onClick={() => {
                setOpenMenu(null);
                onInsertText('@if (Model.SubscriptionType == "Premium") {\n    \n}');
              }}
            >
              <code>@if (...) {'{ }'}</code>
            </button>
            <button
              type="button"
              style={variableButtonStyle}
              onMouseDown={preserveSelection}
              onClick={() => {
                setOpenMenu(null);
                onInsertText('@Model.');
              }}
            >
              <code>@Model.</code>
            </button>
          </div>
        ) : null}
      </div>

      <div style={groupStyle}>
        <button
          type="button"
          style={buttonStyle}
          onMouseDown={preserveSelection}
          onClick={() => onWrapVisibility('mobile-only')}
          title="Wrap selected content so it only shows on mobile devices"
        >
          Mobile Only
        </button>
        <button
          type="button"
          style={buttonStyle}
          onMouseDown={preserveSelection}
          onClick={() => onWrapVisibility('desktop-only')}
          title="Wrap selected content so it only shows on desktop clients"
        >
          Desktop Only
        </button>
        <button
          type="button"
          style={showVisibility ? activeButtonStyle : buttonStyle}
          onMouseDown={preserveSelection}
          onClick={onToggleVisibility}
          title="Toggle highlighting of mobile-only and desktop-only sections"
        >
          Device Visibility
        </button>
      </div>
    </div>
  );
};
