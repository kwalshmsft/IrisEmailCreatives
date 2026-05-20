import { StoredFileInfo } from '../models/localization';

interface StoredFileRecord {
  content: string;
  storedAt: string;
  locale?: string;
}

interface LocalizationFileStore {
  sources: Record<string, StoredFileRecord>;
  generated: Record<string, StoredFileRecord>;
}

const STORAGE_KEY = 'iris-email-creatives.localization-files';
let memoryStore: LocalizationFileStore | null = null;

const createDefaultStore = (): LocalizationFileStore => ({
  sources: {},
  generated: {},
});

const stripExtension = (fileName: string) => fileName.replace(/\.[^.]+$/, '');

const normalizeLocale = (locale: string) => {
  const [language, region] = locale.split('-');
  if (!language) {
    return null;
  }

  return region ? `${language.toLowerCase()}-${region.toUpperCase()}` : language.toLowerCase();
};

const loadStore = (): LocalizationFileStore => {
  if (memoryStore) {
    return memoryStore;
  }

  if (typeof window === 'undefined') {
    memoryStore = createDefaultStore();
    return memoryStore;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    memoryStore = createDefaultStore();
    return memoryStore;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LocalizationFileStore>;
    memoryStore = {
      sources: parsed.sources ?? {},
      generated: parsed.generated ?? {},
    };
  } catch {
    memoryStore = createDefaultStore();
  }

  return memoryStore;
};

const saveStore = (store: LocalizationFileStore) => {
  memoryStore = store;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }
};

const toInfo = (fileName: string, record: StoredFileRecord): StoredFileInfo => ({
  fileName,
  locale: fileStorageService.parseLocale(fileName),
  baseName: fileStorageService.parseBaseName(fileName),
  storedAt: record.storedAt,
});

const toList = (records: Record<string, StoredFileRecord>) =>
  Object.entries(records)
    .map(([fileName, record]) => toInfo(fileName, record))
    .sort((left, right) => right.storedAt.localeCompare(left.storedAt));

export const fileStorageService = {
  storeSource(fileName: string, content: string, locale?: string) {
    const store = loadStore();
    store.sources[fileName] = { content, storedAt: new Date().toISOString(), locale };
    saveStore(store);
  },

  getSourceContent(fileName: string) {
    return loadStore().sources[fileName]?.content ?? null;
  },

  getSourceLocale(fileName: string) {
    return loadStore().sources[fileName]?.locale ?? null;
  },

  getAllSources() {
    return toList(loadStore().sources);
  },

  deleteSource(fileName: string) {
    const store = loadStore();
    delete store.sources[fileName];
    saveStore(store);
  },

  storeGenerated(fileName: string, content: string) {
    const store = loadStore();
    store.generated[fileName] = { content, storedAt: new Date().toISOString() };
    saveStore(store);
  },

  getGeneratedContent(fileName: string) {
    return loadStore().generated[fileName]?.content ?? null;
  },

  getAllGenerated() {
    return toList(loadStore().generated);
  },

  deleteGenerated(fileName: string) {
    const store = loadStore();
    delete store.generated[fileName];
    saveStore(store);
  },

  parseLocale(fileName: string) {
    const match = stripExtension(fileName).match(/_([a-zA-Z]{2,3}(?:-[a-zA-Z]{2,4})?)$/);
    return match ? normalizeLocale(match[1]) : null;
  },

  parseBaseName(fileName: string) {
    const stem = stripExtension(fileName);
    if (!stem) {
      return null;
    }

    return stem.replace(/_([a-zA-Z]{2,3}(?:-[a-zA-Z]{2,4})?)$/, '') || stem;
  },

  findSourceByBaseName(baseName: string) {
    return fileStorageService
      .getAllSources()
      .find((source) => source.baseName?.toLowerCase() === baseName.toLowerCase()) ?? null;
  },
};
