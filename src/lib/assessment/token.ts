import { randomBytes } from "node:crypto";

// 22-char URL-safe token for result pages (spec §10). No external nanoid dep —
// a crypto-random pick over a 64-char alphabet gives ~131 bits, unguessable.
const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";

export function resultToken(size = 22): string {
  const bytes = randomBytes(size);
  let out = "";
  for (let i = 0; i < size; i++) {
    out += ALPHABET[bytes[i] & 63];
  }
  return out;
}
