import { describe, expect, it } from "@jest/globals";
import { keyBytes } from "../push";

describe("the server's push key", () => {
    it("turns URL-safe base64 into the bytes a browser subscribes with", () => {
        // "-_8" is URL-safe for "+/8": bytes 0xfb 0xff 0x3c.
        expect(Array.from(keyBytes("-_88"))).toEqual([0xfb, 0xff, 0x3c]);
        // Unpadded, as servers publish it.
        expect(Array.from(keyBytes("AQI"))).toEqual([1, 2]);
    });
});
