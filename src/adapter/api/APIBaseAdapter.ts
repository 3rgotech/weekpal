import ky from 'ky';

export abstract class APIBaseAdapter {
    protected apiUrl: string;
    protected apiKey: string | undefined;
    protected client: typeof ky;

    constructor(apiUrl: string, apiKey: string | undefined) {
        this.apiUrl = apiUrl;
        this.apiKey = apiKey;

        let headers: Record<string, string> = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        }

        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        this.client = ky.create({
            prefixUrl: this.apiUrl,
            headers: headers,
        });
    }

    protected getClient(): typeof ky {
        return this.client;
    }
}
