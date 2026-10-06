export declare function utf8(input: string): Uint8Array<ArrayBuffer>;
export declare function decodeUtf8(input: Uint8Array): string;
export declare function toBytes(input: string | Uint8Array | ArrayBuffer): Uint8Array<ArrayBuffer>;
export declare function base64UrlEncode(bytes: Uint8Array): string;
export declare function base64UrlDecode(input: string): Uint8Array<ArrayBuffer> | null;
export declare function hexEncode(bytes: Uint8Array): string;
export declare function hexDecode(input: string): Uint8Array<ArrayBuffer> | null;
export declare function randomBytes(length: number): Uint8Array<ArrayBuffer>;
