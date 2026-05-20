export interface ContentGalleryEntry {
  productName: string;
  fileName: string;
  htmlContent: string;
  sourceType: 'html';
  lastModifiedUtc: string;
  updatedBy?: string;
  locale?: string;
  published?: boolean;
  publishedAtUtc?: string;
  publishedHtml?: string;
}

const DB_NAME = 'ContentGallery';
const STORE_NAME = 'entries';
const RECORD_KEY = 'all_entries';

interface GalleryRecord {
  id: string;
  data: ContentGalleryEntry[] | string | null;
}

const makeEntryKey = (productName: string | undefined, fileName: string | undefined) => `${(productName || '').trim()}/${(fileName || '').trim()}`.toLowerCase();

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open gallery database.'));
  });

const readEntries = async (): Promise<ContentGalleryEntry[]> => {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(RECORD_KEY);

    request.onsuccess = () => {
      const record = request.result as GalleryRecord | undefined;
      const payload = record?.data;
      if (!payload) {
        resolve([]);
        return;
      }

      const parsed = typeof payload === 'string' ? (JSON.parse(payload) as ContentGalleryEntry[]) : payload;
      resolve(
        [...parsed].sort(
          (left, right) =>
            new Date(right.lastModifiedUtc).getTime() - new Date(left.lastModifiedUtc).getTime()
        )
      );
    };

    request.onerror = () => reject(request.error ?? new Error('Failed to read gallery entries.'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error ?? new Error('Failed to read gallery entries.'));
  });
};

const writeEntries = async (entries: ContentGalleryEntry[]) => {
  const database = await openDatabase();

  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    store.put({
      id: RECORD_KEY,
      data: entries,
    } satisfies GalleryRecord);

    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error ?? new Error('Failed to save gallery entries.'));
  });
};

export const galleryDbService = {
  async getAllEntries(): Promise<ContentGalleryEntry[]> {
    const entries = await readEntries();
    const valid = entries.filter((e) => (e.productName || '').trim() && (e.fileName || '').trim());
    // Auto-clean orphans with empty names
    if (valid.length < entries.length) {
      await writeEntries(valid);
    }
    return valid;
  },

  async listProducts(): Promise<string[]> {
    const entries = await readEntries();
    return Array.from(new Set(entries.map((entry) => entry.productName.trim()).filter(Boolean))).sort((left, right) =>
      left.localeCompare(right)
    );
  },

  async saveEntry(entry: ContentGalleryEntry): Promise<void> {
    if (!entry.productName.trim() || !entry.fileName.trim()) {
      throw new Error('Product name and file name are required.');
    }

    const normalizedEntry: ContentGalleryEntry = {
      ...entry,
      productName: entry.productName.trim(),
      fileName: entry.fileName.trim(),
      htmlContent: entry.htmlContent,
      lastModifiedUtc: entry.lastModifiedUtc || new Date().toISOString(),
    };

    const entries = await readEntries();
    // Remove any orphaned entries with empty names, plus the entry being replaced
    const filtered = entries.filter(
      (candidate) =>
        candidate.productName.trim() &&
        candidate.fileName.trim() &&
        makeEntryKey(candidate.productName, candidate.fileName) !== makeEntryKey(normalizedEntry.productName, normalizedEntry.fileName)
    );

    filtered.push(normalizedEntry);
    await writeEntries(filtered);
  },

  async getEntry(productName: string, fileName: string): Promise<ContentGalleryEntry | null> {
    const entries = await readEntries();
    return entries.find(
      (entry) => makeEntryKey(entry.productName, entry.fileName) === makeEntryKey(productName, fileName)
    ) || null;
  },

  async deleteEntry(productName: string, fileName: string): Promise<void> {
    const entries = await readEntries();
    const filtered = entries.filter(
      (entry) => makeEntryKey(entry.productName, entry.fileName) !== makeEntryKey(productName, fileName)
    );
    await writeEntries(filtered);
  },
};

export type GalleryDbService = typeof galleryDbService;
