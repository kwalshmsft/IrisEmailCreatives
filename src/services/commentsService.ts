// commentsService.ts — IndexedDB-backed comments for email creatives
// Mirrors Iris Studio's comments API structure for future integration

export interface Comment {
  id: string;
  entityId: string; // productName/fileName key
  content: string;
  author: string;
  createdAt: string;
  isEdited: boolean;
}

const DB_NAME = 'EmailCreativesComments';
const DB_VERSION = 1;
const STORE_NAME = 'comments';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('entityId', 'entityId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getCurrentUser(): string {
  // In Iris Studio integration, this would come from the auth context
  return sessionStorage.getItem('emailEditor:currentUser') || 'me';
}

export const commentsService = {
  async getComments(entityId: string): Promise<Comment[]> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('entityId');
      const request = index.getAll(entityId);
      request.onsuccess = () => {
        const comments = request.result as Comment[];
        comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(comments);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async addComment(entityId: string, content: string): Promise<Comment> {
    const db = await openDb();
    const comment: Comment = {
      id: generateId(),
      entityId,
      content,
      author: getCurrentUser(),
      createdAt: new Date().toISOString(),
      isEdited: false,
    };
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(comment);
      request.onsuccess = () => resolve(comment);
      request.onerror = () => reject(request.error);
    });
  },

  async editComment(commentId: string, content: string): Promise<Comment | null> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(commentId);
      getReq.onsuccess = () => {
        const comment = getReq.result as Comment | undefined;
        if (!comment) { resolve(null); return; }
        comment.content = content;
        comment.isEdited = true;
        const putReq = store.put(comment);
        putReq.onsuccess = () => resolve(comment);
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  },

  async deleteComment(commentId: string): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(commentId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  setCurrentUser(alias: string) {
    sessionStorage.setItem('emailEditor:currentUser', alias);
  },
};
