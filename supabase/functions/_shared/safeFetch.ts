export async function safeFetch(input: RequestInfo | URL, init?: RequestInit, retries = 2): Promise<Response> {
  try {
    const res = await fetch(input, init);
    if (!res.ok && retries > 0 && res.status >= 500) {
      await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
      return safeFetch(input, init, retries - 1);
    }
    return res;
  } catch (e) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
      return safeFetch(input, init, retries - 1);
    }
    throw e;
  }
}


