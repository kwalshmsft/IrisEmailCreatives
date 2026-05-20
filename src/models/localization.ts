export interface StoredFileInfo {
  fileName: string;
  locale: string | null;
  baseName: string | null;
  storedAt: string;
}

export interface LocalizableString {
  key: string;
  value: string;
  context: string;
  type: 'text' | 'html';
  path: string;
  attribute: string;
}

export interface IrisContentInfo {
  items: IrisContentItem[];
}

export interface IrisContentItem {
  name: string;
  id: string;
  existingVariants: string[];
}

export interface IrisImportResult {
  variants: string[];
  zipBlob: Blob;
}
