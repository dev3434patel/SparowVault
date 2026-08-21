// Lightweight PIN hashing for local-only auth. Not meant to survive a
// motivated attacker with device access — IndexedDB is not a vault. This
// exists so raw PINs are not stored in plaintext.

function bufToHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  let out = "";
  for (let i = 0; i < arr.length; i++) out += arr[i].toString(16).padStart(2, "0");
  return out;
}

export function generateSalt(): string {
  return randomHex(16);
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`sv::${salt}::${pin}`);
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", data);
    return bufToHex(digest);
  }
  // Fallback - simple non-cryptographic hash (should rarely trigger in modern browsers)
  let h = 5381;
  for (let i = 0; i < data.length; i++) h = ((h << 5) + h + data[i]) | 0;
  return Math.abs(h).toString(16);
}

export async function verifyPin(pin: string, salt: string, expectedHash: string) {
  const h = await hashPin(pin, salt);
  return h === expectedHash;
}
