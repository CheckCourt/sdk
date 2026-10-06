export interface Recorded {
  url: string;
  method: string;
  headers: Headers;
  body: string;
}

type Handler = (req: Recorded, index: number) => Response | Promise<Response>;

/** A fetch that records every request and answers from `handler`. */
export function mockFetch(handler: Handler) {
  const calls: Recorded[] = [];
  const fn = async (request: Request): Promise<Response> => {
    const recorded = {
      url: request.url,
      method: request.method,
      headers: new Headers(request.headers),
      body: await request.text(),
    };
    calls.push(recorded);
    return handler(recorded, calls.length - 1);
  };
  return Object.assign(fn, { calls });
}

export function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}
