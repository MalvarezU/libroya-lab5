import type { CartItem } from "./cart";

const KEY_PREFIX = "libroYa_checkout:";
const SAFE_KEY = /^[A-Za-z0-9._:-]{8,128}$/;

interface StoredCheckout {
  fingerprint: string;
  key: string;
}

interface PreparedOrder {
  id: string;
  userId: string;
  fingerprint: string;
}

export type { PreparedOrder };

export function checkoutFingerprint(items: CartItem[], address: string): string {
  const canonicalItems = items
    .map((item) => ({ bookId: item.book._id, quantity: item.quantity }))
    .sort((left, right) => left.bookId.localeCompare(right.bookId));
  return JSON.stringify({ items: canonicalItems, address: address.trim() });
}

function storageKey(userId: string): string {
  return `${KEY_PREFIX}${encodeURIComponent(userId)}`;
}

function readStoredCheckout(userId: string): StoredCheckout | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredCheckout>;
    if (
      typeof parsed.fingerprint !== "string"
      || typeof parsed.key !== "string"
      || !SAFE_KEY.test(parsed.key)
    ) {
      return null;
    }
    return { fingerprint: parsed.fingerprint, key: parsed.key };
  } catch {
    return null;
  }
}

function writeStoredCheckout(userId: string, checkout: StoredCheckout): void {
  try {
    window.sessionStorage.setItem(storageKey(userId), JSON.stringify(checkout));
  } catch {
    // Checkout still works when browser storage is unavailable.
  }
}

export function getCheckoutKey(userId: string, fingerprint: string): string {
  const stored = readStoredCheckout(userId);
  if (stored?.fingerprint === fingerprint) return stored.key;

  const key = crypto.randomUUID();
  writeStoredCheckout(userId, { fingerprint, key });
  return key;
}

export function clearCheckoutKey(userId: string): void {
  try {
    window.sessionStorage.removeItem(storageKey(userId));
  } catch {
    // Ignore unavailable browser storage.
  }
}
