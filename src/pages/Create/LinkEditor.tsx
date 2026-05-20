import React from 'react';

interface LinkEditorProps {
  isOpen: boolean;
  href: string;
  alias: string;
  text: string;
  mode: 'create' | 'edit';
  onHrefChange: (value: string) => void;
  onAliasChange: (value: string) => void;
  onApply: () => void;
  onClose: () => void;
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.35)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 16,
};

const dialogStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 520,
  backgroundColor: '#ffffff',
  borderRadius: 4,
  boxShadow: '0 1.6px 3.6px 0 rgba(0,0,0,0.132), 0 0.3px 0.9px 0 rgba(0,0,0,0.108)',
  overflow: 'hidden',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 4,
  border: '1px solid #8a8886',
  fontFamily: 'Segoe UI, sans-serif',
  fontSize: 14,
  boxSizing: 'border-box',
};

const buttonStyle: React.CSSProperties = {
  borderRadius: 4,
  padding: '8px 12px',
  border: '1px solid #c8c6c4',
  backgroundColor: '#ffffff',
  color: '#323130',
  cursor: 'pointer',
};

const primaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  borderColor: '#0078d4',
  backgroundColor: '#0078d4',
  color: '#ffffff',
};

export const LinkEditor: React.FC<LinkEditorProps> = ({
  isOpen,
  href,
  alias,
  text,
  mode,
  onHrefChange,
  onAliasChange,
  onApply,
  onClose,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={(event) => event.stopPropagation()}>
        <div style={{ backgroundColor: '#dce6f0', padding: '10px 16px', fontWeight: 600, color: '#323130' }}>
          {mode === 'create' ? 'Create Link' : 'Edit Link'}
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span>Link text</span>
            <div
              style={{
                ...inputStyle,
                backgroundColor: '#f3f2f1',
                minHeight: 36,
                color: '#605e5c',
              }}
            >
              {text || '(selected content)'}
            </div>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span>Destination URL</span>
            <input
              value={href}
              placeholder="https://"
              onChange={(event) => onHrefChange(event.target.value)}
              style={inputStyle}
            />
            <button
              type="button"
              style={{ ...buttonStyle, alignSelf: 'flex-start', fontSize: 12, padding: '4px 8px' }}
              onClick={() => onHrefChange('##UnsubscribeLinkPlaceholder##')}
            >
              Use Unsubscribe Placeholder
            </button>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span>Alias</span>
            <input value={alias} onChange={(event) => onAliasChange(event.target.value)} style={inputStyle} />
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" style={buttonStyle} onClick={onClose}>
              Cancel
            </button>
            <button type="button" style={primaryButtonStyle} onClick={onApply} disabled={!href.trim()}>
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
