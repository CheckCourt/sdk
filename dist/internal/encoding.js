const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
export function utf8(input) {
    return encoder.encode(input);
}
export function decodeUtf8(input) {
    return decoder.decode(input);
}
export function toBytes(input) {
    if (typeof input === "string")
        return utf8(input);
    if (input instanceof ArrayBuffer)
        return new Uint8Array(input);
    return new Uint8Array(input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength));
}
export function base64UrlEncode(bytes) {
    let binary = "";
    for (const byte of bytes)
        binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function base64UrlDecode(input) {
    if (!/^[A-Za-z0-9_-]*$/.test(input) || input.length % 4 === 1)
        return null;
    const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
    try {
        const binary = atob(padded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++)
            bytes[i] = binary.charCodeAt(i);
        return bytes;
    }
    catch {
        return null;
    }
}
export function hexEncode(bytes) {
    let out = "";
    for (const byte of bytes)
        out += byte.toString(16).padStart(2, "0");
    return out;
}
export function hexDecode(input) {
    if (input.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(input))
        return null;
    const bytes = new Uint8Array(input.length / 2);
    for (let i = 0; i < bytes.length; i++)
        bytes[i] = parseInt(input.slice(i * 2, i * 2 + 2), 16);
    return bytes;
}
export function randomBytes(length) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
}
