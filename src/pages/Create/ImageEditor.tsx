import React from 'react';
import { ImageAddRegular } from '@fluentui/react-icons';

interface ImageEditorProps {
  isOpen: boolean;
  src: string;
  alt: string;
  linkHref: string;
  linkAlias: string;
  width?: number;
  height?: number;
  onSrcChange: (value: string) => void;
  onAltChange: (value: string) => void;
  onLinkHrefChange: (value: string) => void;
  onLinkAliasChange: (value: string) => void;
  onDimensionsChange?: (width: number, height: number) => void;
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

export const ImageEditor: React.FC<ImageEditorProps> = ({
  isOpen,
  src,
  alt,
  linkHref,
  linkAlias,
  width,
  height,
  onSrcChange,
  onAltChange,
  onLinkHrefChange,
  onLinkAliasChange,
  onDimensionsChange,
  onApply,
  onClose,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = React.useState(false);

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);

    // TODO: Replace with actual blob storage upload
    const objectUrl = URL.createObjectURL(file);
    // Simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Update the image URL
    onSrcChange(objectUrl);

    // Load image to get dimensions
    const img = new Image();
    img.onload = () => {
      if (onDimensionsChange) {
        onDimensionsChange(img.naturalWidth, img.naturalHeight);
      }
      setUploading(false);
    };
    img.onerror = () => {
      setUploading(false);
    };
    img.src = objectUrl;
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={(event) => event.stopPropagation()}>
        <div style={{ backgroundColor: '#dce6f0', padding: '10px 16px', fontWeight: 600, color: '#323130' }}>
          Edit Image
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {src ? (
            <div style={{ textAlign: 'center' }}>
              <img src={src} alt={alt || 'Preview'} style={{ maxWidth: '100%', maxHeight: 160 }} />
              {width && height ? (
                <div style={{ marginTop: 6, fontSize: 12, color: '#605e5c' }}>
                  Dimensions: {width} × {height} px
                </div>
              ) : null}
            </div>
          ) : null}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span>Image URL</span>
            <input value={src} onChange={(event) => onSrcChange(event.target.value)} style={inputStyle} />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => void handleFileSelected(e)}
            />
            <button
              type="button"
              style={{ ...buttonStyle, alignSelf: 'flex-start', fontSize: 12, padding: '4px 8px', color: '#0078d4', borderColor: '#0078d4', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <ImageAddRegular style={{ fontSize: 14 }} />
              {uploading ? 'Uploading…' : 'Upload New Image…'}
            </button>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span>Alt text</span>
            <input value={alt} onChange={(event) => onAltChange(event.target.value)} style={inputStyle} />
          </label>
          <hr style={{ border: 'none', borderTop: '1px solid #edebe9', margin: '4px 0' }} />
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span>Link URL</span>
            <input
              value={linkHref}
              placeholder="https:// (leave empty for no link)"
              onChange={(event) => onLinkHrefChange(event.target.value)}
              style={inputStyle}
            />
            <button
              type="button"
              style={{ ...buttonStyle, alignSelf: 'flex-start', fontSize: 12, padding: '4px 8px' }}
              onClick={() => onLinkHrefChange('##UnsubscribeLinkPlaceholder##')}
            >
              Use Unsubscribe Placeholder
            </button>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span>Link alias</span>
            <input
              value={linkAlias}
              onChange={(event) => {
                const val = event.target.value.replace(/\s/g, '');
                onLinkAliasChange(val);
              }}
              style={{
                ...inputStyle,
                borderColor: linkAlias && !/^[a-zA-Z0-9_-]*$/.test(linkAlias) ? '#a4262c' : undefined,
              }}
              placeholder="e.g. hero-banner_cta"
            />
            {linkAlias && !/^[a-zA-Z0-9_-]*$/.test(linkAlias) && (
              <span style={{ fontSize: 11, color: '#a4262c' }}>Only letters, numbers, hyphens, and underscores allowed.</span>
            )}
          </label>
          <div style={{ fontSize: 12, color: '#605e5c', fontStyle: 'italic', marginBottom: 4 }}>
            Tip: Double-click an image to select it for Mobile Only / Desktop Only wrapping.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" style={buttonStyle} onClick={onClose}>
              Cancel
            </button>
            <button type="button" style={primaryButtonStyle} onClick={onApply}>
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
