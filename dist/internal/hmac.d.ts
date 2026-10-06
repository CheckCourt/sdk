export declare function hmacSha256(secret: string, data: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>>;
/** WebCrypto's verify compares in constant time. */
export declare function hmacSha256Verify(secret: string, data: Uint8Array<ArrayBuffer>, signature: Uint8Array<ArrayBuffer>): Promise<boolean>;
export declare function sha256(data: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>>;
