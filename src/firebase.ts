import { Entry } from './types';
import { get, set } from 'idb-keyval';

export const auth = {
  currentUser: { uid: 'local-user', email: 'user@local.com', emailVerified: true, isAnonymous: false, tenantId: null, providerData: [] }
};

export const googleProvider = {};

export function onAuthStateChanged(auth: any, callback: (user: any) => void) {
  callback(auth.currentUser);
  return () => {};
}

export async function signInWithPopup(auth: any, provider: any) {
  return { user: auth.currentUser };
}

export class Timestamp {
  seconds: number;
  nanoseconds: number;
  constructor(seconds: number, nanoseconds: number) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }
  static now() {
    return new Timestamp(Math.floor(Date.now() / 1000), 0);
  }
  toMillis() {
    return this.seconds * 1000 + this.nanoseconds / 1000000;
  }
  toDate() {
    return new Date(this.toMillis());
  }
}

const LOCAL_STORAGE_KEY = 'second-brain-entries';

async function getLocalData(): Promise<Entry[]> {
  try {
    const data = await get(LOCAL_STORAGE_KEY);
    if (!data) return [];
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    return parsed.map((item: any) => ({
      ...item,
      createdAt: item.createdAt ? new Timestamp(item.createdAt.seconds, item.createdAt.nanoseconds) : Timestamp.now(),
      updatedAt: item.updatedAt ? new Timestamp(item.updatedAt.seconds, item.updatedAt.nanoseconds) : Timestamp.now(),
      messages: item.messages?.map((m: any) => ({
        ...m,
        timestamp: m.timestamp ? new Timestamp(m.timestamp.seconds, m.timestamp.nanoseconds) : Timestamp.now()
      }))
    }));
  } catch (e) {
    // Fallback to localStorage if IDB fails or is empty, to migrate old data
    const lsData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (lsData) {
      try {
        const parsed = JSON.parse(lsData);
        await set(LOCAL_STORAGE_KEY, lsData); // migrate it
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        return parsed;
      } catch {
        return [];
      }
    }
    return [];
  }
}

async function saveLocalData(data: Entry[]) {
  try {
    await set(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save to IDB:", e);
  }
  notifyListeners();
}

let listeners: ((data: Entry[]) => void)[] = [];

async function notifyListeners() {
  const data = await getLocalData();
  listeners.forEach(l => l(data));
}

export const db = {};

export function collection(db: any, path: string) {
  return path;
}

export function doc(db: any, path: string, id?: string) {
  if (id) return { path, id };
  return { path, id: Math.random().toString(36).substring(2, 15) };
}

export async function addDoc(collectionPath: string, data: any) {
  const entries = await getLocalData();
  const id = Math.random().toString(36).substring(2, 15);
  const newEntry = { id, ...data };
  entries.push(newEntry);
  await saveLocalData(entries);
  return { id };
}

export async function setDoc(docRef: {path: string, id: string}, data: any) {
  let entries = await getLocalData();
  const index = entries.findIndex(e => e.id === docRef.id);
  if (index >= 0) {
    entries[index] = { ...entries[index], ...data };
  } else {
    entries.push({ id: docRef.id, ...data } as any);
  }
  await saveLocalData(entries);
}

export async function updateDoc(docRef: {path: string, id: string}, data: any) {
  let entries = await getLocalData();
  const index = entries.findIndex(e => e.id === docRef.id);
  if (index >= 0) {
    entries[index] = { ...entries[index], ...data };
    await saveLocalData(entries);
  }
}

export async function deleteDoc(docRef: {path: string, id: string}) {
  let entries = await getLocalData();
  entries = entries.filter(e => e.id !== docRef.id);
  await saveLocalData(entries);
}

export async function getDocFromServer(docRef: {path: string, id: string}) {
  return { exists: () => true };
}

export function query(col: any, ...constraints: any[]) {
  return { col, constraints };
}

export function where(field: string, op: string, value: any) {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, dir: string) {
  return { type: 'orderBy', field, dir };
}

export function onSnapshot(q: any, callback: (snapshot: any) => void, errorCallback?: (error: any) => void) {
  const listener = (data: Entry[]) => {
    let filtered = data;
    const whereConstraints = q.constraints?.filter((c: any) => c.type === 'where') || [];
    whereConstraints.forEach((c: any) => {
      if (c.field === 'userId') {
         filtered = filtered.filter(e => e.userId === c.value);
      }
    });
    
    const orderConstraint = q.constraints?.find((c: any) => c.type === 'orderBy');
    if (orderConstraint) {
      filtered.sort((a: any, b: any) => {
        const aVal = a[orderConstraint.field]?.toMillis() || 0;
        const bVal = b[orderConstraint.field]?.toMillis() || 0;
        return orderConstraint.dir === 'desc' ? bVal - aVal : aVal - bVal;
      });
    }

    callback({
      docs: filtered.map(item => ({
        id: item.id,
        data: () => item
      }))
    });
  };
  
  listeners.push(listener);
  getLocalData().then(data => listener(data));
  
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

export async function testConnection() {}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error('Firestore Mock Error: ', error, operationType, path);
}

export type User = { uid: string };
