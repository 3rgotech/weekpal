/**
 * @jest-environment node
 *
 * Node rather than jsdom, like the other adapter tests: ky needs Node's fetch stack.
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import APICategoryAdapter from "../api/APICategoryAdapter";
import Category from "../../data/category";

let bodies: any[];

const respondWith = (payload: unknown) => {
    (globalThis as any).fetch = jest.fn(async (request: any) => {
        bodies.push(request.method === "PUT" ? await request.clone().json() : null);

        return new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } });
    });
};

const row = { id: "a", name: "Work", color: "sky", day_limit: null, is_private: false, event_keywords: ["standup"] };

beforeEach(() => {
    bodies = [];
});

describe("event keywords on the wire (#36)", () => {
    it("reads them from the server", async () => {
        respondWith({ data: [row] });

        const [category] = await new APICategoryAdapter("https://api.test/api/v1", undefined).list();

        expect(category.eventKeywords).toEqual(["standup"]);
    });

    it("sends them when the board knows them", async () => {
        respondWith({ data: row });

        await new APICategoryAdapter("https://api.test/api/v1", undefined)
            .upsert(new Category({ id: "a", name: "Work", color: "sky", eventKeywords: ["standup", "1:1"] }));

        expect(bodies[0].event_keywords).toEqual(["standup", "1:1"]);
    });

    it("leaves them out when it does not, so the server keeps its own", async () => {
        respondWith({ data: row });

        await new APICategoryAdapter("https://api.test/api/v1", undefined)
            .upsert(new Category({ id: "a", name: "Work", color: "sky" }));

        expect("event_keywords" in bodies[0]).toBe(false);
    });
});
