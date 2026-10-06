import { utf8 } from "./encoding.js";
async function importKey(secret) {
    return crypto.subtle.importKey("raw", utf8(secret), { name: "HMAC", hash: "SHA-256" }, false, [
        "sign",
        "verify",
    ]);
}
export async function hmacSha256(secret, data) {
    return new Uint8Array(await crypto.subtle.sign("HMAC", await importKey(secret), data));
}
/** WebCrypto's verify compares in constant time. */
export async function hmacSha256Verify(secret, data, signature) {
    return crypto.subtle.verify("HMAC", await importKey(secret), signature, data);
}
export async function sha256(data) {
    return new Uint8Array(await crypto.subtle.digest("SHA-256", data));
}
