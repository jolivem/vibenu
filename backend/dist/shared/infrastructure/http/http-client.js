export class HttpClient {
    async getJson(url) {
        const response = await fetch(url, {
            headers: {
                Accept: "application/json",
            },
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} sur ${url}`);
        }
        return (await response.json());
    }
}
//# sourceMappingURL=http-client.js.map