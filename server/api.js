const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.API_PORT || 3002;
const DATA_FILE = path.join(__dirname, 'data', 'gallery.json');

app.use(express.json({ limit: '10mb' }));

// --- Atomic file I/O with write serialization ---

let writeQueue = Promise.resolve();

function readStore() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { entries: {}, nextSequence: 1 };
  }
}

function writeStore(store) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf-8');
  fs.renameSync(tmp, DATA_FILE);
}

function serialize(fn) {
  writeQueue = writeQueue.then(fn).catch(fn);
  return writeQueue;
}

// --- Routes ---

// GET /api/entries - list all
app.get('/api/entries', (req, res) => {
  const store = readStore();
  const entries = Object.values(store.entries).sort(
    (a, b) => (b.lastModifiedUtc || '').localeCompare(a.lastModifiedUtc || '')
  );
  res.json(entries);
});

// GET /api/entries/:id - get one
app.get('/api/entries/:id', (req, res) => {
  const store = readStore();
  const entry = store.entries[req.params.id];
  if (!entry) return res.status(404).json({ error: 'Not found' });
  res.json(entry);
});

// POST /api/entries - create new (server generates ID)
app.post('/api/entries', (req, res) => {
  serialize(() => {
    const store = readStore();
    const seq = store.nextSequence || 1;
    const contentId = `128000000006${String(seq).padStart(6, '0')}`;
    store.nextSequence = seq + 1;

    const entry = {
      ...req.body,
      contentId,
      lastModifiedUtc: new Date().toISOString(),
    };
    store.entries[contentId] = entry;
    writeStore(store);
    res.status(201).json(entry);
  });
});

// PUT /api/entries/:id - create or update
app.put('/api/entries/:id', (req, res) => {
  const { id } = req.params;
  if (!req.body || !req.body.displayName) {
    return res.status(400).json({ error: 'displayName required' });
  }

  serialize(() => {
    const store = readStore();
    store.entries[id] = {
      ...req.body,
      contentId: id,
      lastModifiedUtc: new Date().toISOString(),
    };
    writeStore(store);
    res.json(store.entries[id]);
  });
});

// DELETE /api/entries/:id
app.delete('/api/entries/:id', (req, res) => {
  serialize(() => {
    const store = readStore();
    if (!store.entries[req.params.id]) {
      return res.status(404).json({ error: 'Not found' });
    }
    delete store.entries[req.params.id];
    writeStore(store);
    res.status(204).end();
  });
});

// POST /api/content-id - generate a new content ID without creating an entry
app.post('/api/content-id', (req, res) => {
  serialize(() => {
    const store = readStore();
    const seq = store.nextSequence || 1;
    const contentId = `128000000006${String(seq).padStart(6, '0')}`;
    store.nextSequence = seq + 1;
    writeStore(store);
    res.json({ contentId });
  });
});

app.listen(PORT, () => {
  console.log(`Gallery API server running on port ${PORT}`);
});
