export interface LocaleAssetData {
  locale: string;
  subject: string;
  html: string;
  plainText: string;
}

// --- Predefined configuration ---
export const CONTENT_TAXONOMY = {
  productCategory: 'M365',
  productSubcategory: 'Email',
  surfaceName: 'M365 Commercial End User Email',
};

export interface ContentGalleryEntry {
  contentId: string;
  productCategory: string;
  productSubcategory: string;
  surfaceName: string;
  displayName: string;
  htmlContent: string;
  sourceType: 'html';
  lastModifiedUtc: string;
  updatedBy?: string;
  locale?: string;
  published?: boolean;
  publishedAtUtc?: string;
  publishedHtml?: string;
  plainTextContent?: string;
  plainTextGeneratedAtUtc?: string;
  localeAssets?: LocaleAssetData[];
}

const DB_NAME = 'ContentGallery';
const STORE_NAME = 'entries';
const RECORD_KEY = 'all_entries';
const COUNTER_KEY = 'content_id_counter';
const STARTING_ID = '128000000006000000';

interface GalleryRecord {
  id: string;
  data: ContentGalleryEntry[] | string | null;
}

interface CounterRecord {
  id: string;
  value: string;
}

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 2);

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

const generateContentId = async (): Promise<string> => {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(COUNTER_KEY);

    request.onsuccess = () => {
      const record = request.result as CounterRecord | undefined;
      const current = record?.value || STARTING_ID;
      const next = (BigInt(current) + BigInt(1)).toString();
      store.put({ id: COUNTER_KEY, value: next } satisfies CounterRecord);
      transaction.oncomplete = () => {
        database.close();
        resolve(next);
      };
    };

    request.onerror = () => reject(request.error ?? new Error('Failed to generate content ID.'));
    transaction.onerror = () => reject(transaction.error ?? new Error('Failed to generate content ID.'));
  });
};

// Migrate legacy entries (productName/fileName format) to new model
const migrateIfNeeded = (entries: any[]): ContentGalleryEntry[] => {
  return entries.map((entry) => {
    if (entry.contentId) return entry as ContentGalleryEntry;
    // Legacy entry with productName/fileName
    const legacyName = entry.fileName || entry.productName || 'Untitled';
    return {
      contentId: `legacy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      productCategory: CONTENT_TAXONOMY.productCategory,
      productSubcategory: CONTENT_TAXONOMY.productSubcategory,
      surfaceName: CONTENT_TAXONOMY.surfaceName,
      displayName: legacyName.replace(/\.html?$/i, ''),
      htmlContent: entry.htmlContent || '',
      sourceType: 'html' as const,
      lastModifiedUtc: entry.lastModifiedUtc || new Date().toISOString(),
      updatedBy: entry.updatedBy,
      locale: entry.locale,
      published: entry.published,
      publishedAtUtc: entry.publishedAtUtc,
      publishedHtml: entry.publishedHtml,
      plainTextContent: entry.plainTextContent,
      plainTextGeneratedAtUtc: entry.plainTextGeneratedAtUtc,
      localeAssets: entry.localeAssets,
    } as ContentGalleryEntry;
  });
};

export const galleryDbService = {
  async getAllEntries(): Promise<ContentGalleryEntry[]> {
    const raw = await readEntries();
    const entries = migrateIfNeeded(raw);
    const valid = entries.filter((e) => e.contentId);
    // Persist migration if any entries changed
    if (raw.length > 0 && JSON.stringify(raw) !== JSON.stringify(valid)) {
      await writeEntries(valid);
    }
    return valid;
  },

  async generateContentId(): Promise<string> {
    return generateContentId();
  },

  async saveEntry(entry: ContentGalleryEntry): Promise<void> {
    if (!entry.contentId) {
      throw new Error('Content ID is required.');
    }

    const normalizedEntry: ContentGalleryEntry = {
      ...entry,
      lastModifiedUtc: entry.lastModifiedUtc || new Date().toISOString(),
    };

    const entries = await readEntries();
    const migrated = migrateIfNeeded(entries);
    const filtered = migrated.filter((candidate) => candidate.contentId !== normalizedEntry.contentId);

    filtered.push(normalizedEntry);
    await writeEntries(filtered);
  },

  async getEntry(contentId: string): Promise<ContentGalleryEntry | null> {
    const entries = await readEntries();
    const migrated = migrateIfNeeded(entries);
    return migrated.find((entry) => entry.contentId === contentId) || null;
  },

  async deleteEntry(contentId: string): Promise<void> {
    const entries = await readEntries();
    const migrated = migrateIfNeeded(entries);
    const filtered = migrated.filter((entry) => entry.contentId !== contentId);
    await writeEntries(filtered);
  },
};

export type GalleryDbService = typeof galleryDbService;
