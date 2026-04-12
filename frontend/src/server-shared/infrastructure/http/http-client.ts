export class HttpClient {
  async getJson<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} sur ${url}`);
    }

    return (await response.json()) as T;
  }
}
