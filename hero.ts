import { heroui } from "@heroui/react";

/**
 * HeroUI's Tailwind plugin, as a module rather than a `plugins:` entry.
 *
 * Tailwind 4 has no JavaScript config to list plugins in — they are loaded from the stylesheet
 * with `@plugin`, which takes a path to a module whose default export is the plugin. This file
 * exists only to be that path.
 */
export default heroui();
