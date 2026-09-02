import { describe, expect, it } from "@jest/globals";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import * as stub from "../heroui";

/** Every `.ts`/`.tsx` under `src/`, minus this support directory. */
const sources = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);

        if (entry.isDirectory()) {
            return entry.name === "test-support" ? [] : sources(path);
        }

        return /\.tsx?$/.test(entry.name) ? [path] : [];
    });

/**
 * The stand-in has to export whatever the app imports.
 *
 * A missing one does not fail here, it fails wherever the component renders — as "Element type is
 * invalid: ... got: undefined", naming the component that *contains* the missing one rather than
 * the missing one itself. This says which name it is.
 */
describe("the HeroUI stand-in", () => {
    it("exports everything the board imports from @heroui/react", () => {
        const imported = new Set<string>();

        sources(join(__dirname, "..", "..")).forEach((file) => {
            const source = readFileSync(file, "utf8");

            for (const match of source.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']@heroui\/react["']/gs)) {
                match[1]
                    .split(",")
                    .map((name) => name.trim().split(/\s+as\s+/)[0].trim())
                    .filter((name) => name && !name.startsWith("type "))
                    .forEach((name) => imported.add(name));
            }
        });

        // A guard that asserts nothing would pass just as happily against an empty set.
        expect(imported.size).toBeGreaterThan(10);

        expect([...imported].filter((name) => !(name in stub))).toEqual([]);
    });
});
