/**
 * @jest-environment node
 *
 * As with the other adapter tests: this speaks HTTP and touches no DOM, and jsdom has no fetch
 * stack for ky to import.
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import APIChangelogAdapter from "../api/APIChangelogAdapter";

let calls: Array<{ url: string; method: string }>;

const respondWith = (payload: unknown, status = 200) => {
    (globalThis as any).fetch = jest.fn(async (request: any) => {
        calls.push({ url: request.url, method: request.method.toUpperCase() });

        return new Response(status === 204 ? null : JSON.stringify(payload), {
            status,
            headers: { "Content-Type": "application/json" },
        });
    });
};

const adapter = () => new APIChangelogAdapter("https://example.test/api/v1", "token");

beforeEach(() => {
    calls = [];
});

describe("APIChangelogAdapter", () => {
    it("reads the release notes and carries the seen flag through", async () => {
        respondWith({
            data: [
                {
                    id: 4,
                    version: "1.1.0",
                    title: "Estimates",
                    description: "Say how long a task will take.",
                    body: "<p>Details</p>",
                    published_at: "2026-02-01T09:00:00+00:00",
                    seen: false,
                },
            ],
        });

        const entries = await adapter().list();

        expect(calls[0].url).toBe("https://example.test/api/v1/changelog");
        expect(calls[0].method).toBe("GET");
        expect(entries).toEqual([
            {
                id: 4,
                version: "1.1.0",
                title: "Estimates",
                description: "Say how long a task will take.",
                body: "<p>Details</p>",
                publishedAt: "2026-02-01T09:00:00+00:00",
                seen: false,
            },
        ]);
    });

    it("keeps a null version rather than inventing one", async () => {
        // Everything written before the v1.0.0 tag. The dialog shows the date alone.
        respondWith({
            data: [{
                id: 1,
                version: null,
                title: "Early days",
                description: "Before the tag.",
                body: "<p>…</p>",
                published_at: "2025-11-01T09:00:00+00:00",
                seen: true,
            }],
        });

        expect((await adapter().list())[0].version).toBeNull();
    });

    it("posts the acknowledgement to its own route", async () => {
        respondWith(null, 204);

        await adapter().markRead();

        expect(calls[0].url).toBe("https://example.test/api/v1/changelog/read");
        expect(calls[0].method).toBe("POST");
    });

    it("raises when the notes cannot be read, so the provider can stay quiet about it", async () => {
        respondWith({ message: "Not Found" }, 404);

        await expect(adapter().list()).rejects.toThrow();
    });
});
