const database = new Promise((resolve, reject) => {
  const request = indexedDB.open('proyector-lldm-lite', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('documents');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

export async function getLists() {
  const db = await database;
  return new Promise((resolve, reject) => {
    const request = db.transaction('documents').objectStore('documents').get('lists');
    request.onsuccess = () => resolve(request.result || {});
    request.onerror = () => reject(request.error);
  });
}

export async function saveLists(changes) {
  const db = await database;
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('documents', 'readwrite');
    const store = transaction.objectStore('documents');
    const read = store.get('lists');
    let updated;
    read.onsuccess = () => {
      updated = { ...read.result, ...changes };
      store.put(updated, 'lists');
    };
    transaction.oncomplete = () => resolve(updated);
    transaction.onabort = () => reject(transaction.error);
  });
}
