/**
 * Délai maximal par défaut d'un appel : une API publique qui ralentit ne doit pas retenir
 * toute l'analyse, qui attend sa source la plus lente.
 */
const DEFAULT_TIMEOUT_MS = 6_000;

export class HttpClient {
  constructor(private readonly timeoutMs = DEFAULT_TIMEOUT_MS) {}

  async getJson<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} sur ${url}`);
    }

    return (await response.json()) as T;
  }
}
