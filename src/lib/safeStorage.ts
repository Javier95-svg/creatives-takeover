import type { StateStorage } from 'zustand/middleware';

const createNoopStorage = (): StateStorage => ({
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
});

export const getSafeLocalStorage = (): StateStorage => {
  if (typeof window === 'undefined') return createNoopStorage();

  try {
    const storage = window.localStorage;
    const testKey = '__ct_storage_test__';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return storage;
  } catch (error) {
    console.warn('Local storage unavailable:', error);
    return createNoopStorage();
  }
};

export const getSafeSessionStorage = (): StateStorage => {
  if (typeof window === 'undefined') return createNoopStorage();

  try {
    const storage = window.sessionStorage;
    const testKey = '__ct_session_test__';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return storage;
  } catch (error) {
    console.warn('Session storage unavailable:', error);
    return createNoopStorage();
  }
};
