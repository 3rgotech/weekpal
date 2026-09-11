import { describe, expect, it } from "@jest/globals";
import { hasMarkdownContent, renderMarkdown, safeHref } from "../markdown";

/**
 * A task description is written by anybody and rendered as HTML, so the first and longest part of
 * this file is about what cannot come out of it.
 */
describe("nothing the user types can become markup", () => {
    it("escapes a script tag into text", () => {
        expect(renderMarkdown("<script>alert(1)</script>"))
            .toBe("<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
    });

    it("escapes an image with an error handler", () => {
        const html = renderMarkdown('<img src=x onerror="alert(1)">');

        expect(html).not.toContain("<img");
        expect(html).toContain("&lt;img");
    });

    it("escapes a tag hidden inside emphasis", () => {
        // The formatting passes run *after* escaping, so there is no arrangement of markdown
        // that lets a bracket through — every angle bracket in the output was put there by us.
        expect(renderMarkdown("**<b>bold</b>**"))
            .toBe("<p><strong>&lt;b&gt;bold&lt;/b&gt;</strong></p>");
    });

    it("escapes quotes, so nothing can break out of an attribute", () => {
        expect(renderMarkdown('a " quote')).toContain("&quot;");
    });

    it("leaves an ampersand as an entity rather than as itself", () => {
        expect(renderMarkdown("Tom & Jerry")).toBe("<p>Tom &amp; Jerry</p>");
    });

    it("does not let an entity be reassembled into a tag", () => {
        // `&lt;script&gt;` typed literally must stay literal, not be decoded on the way out.
        expect(renderMarkdown("&lt;script&gt;")).toBe("<p>&amp;lt;script&amp;gt;</p>");
    });
});

describe("link targets, which escaping alone does not make safe", () => {
    it("refuses a javascript: link and keeps the words", () => {
        // The words are the user's own. Dropping them to protect somebody from a link they typed
        // themselves would lose what they wrote.
        expect(renderMarkdown("[click me](javascript:alert(1))"))
            .toBe("<p>click me</p>");
    });

    it("refuses a javascript: link broken up by whitespace", () => {
        // Browsers strip tabs and newlines before resolving a URL, so this is a working payload
        // against a naive `startsWith` test.
        expect(safeHref("java\tscript:alert(1)")).toBeNull();
        expect(safeHref("java\nscript:alert(1)")).toBeNull();
        expect(safeHref(" javascript:alert(1)")).toBeNull();
    });

    it("refuses a data: link", () => {
        expect(safeHref("data:text/html,<script>alert(1)</script>")).toBeNull();
    });

    it("refuses a relative one, which a protocol-relative URL can impersonate", () => {
        // `/` is one character away from `//evil.test`, and a task description has no business
        // pointing inside the application anyway.
        expect(safeHref("/admin")).toBeNull();
        expect(safeHref("//evil.test")).toBeNull();
    });

    it("keeps a real link, and sends it out of the tab safely", () => {
        expect(renderMarkdown("[docs](https://weekpal.app/docs)"))
            .toBe('<p><a href="https://weekpal.app/docs" target="_blank" rel="noopener noreferrer">docs</a></p>');
    });

    it("keeps a mailto link", () => {
        expect(safeHref("mailto:hi@weekpal.app")).toBe("mailto:hi@weekpal.app");
    });

    it("links a bare URL that was pasted in", () => {
        expect(renderMarkdown("see https://weekpal.app for more"))
            .toContain('<a href="https://weekpal.app"');
    });

    it("does not link the URL inside a link twice", () => {
        const html = renderMarkdown("[docs](https://weekpal.app)");

        expect(html.match(/<a /g)).toHaveLength(1);
    });
});

describe("the formatting a description actually needs", () => {
    it("renders bold and italic", () => {
        expect(renderMarkdown("**bold** and *italic*"))
            .toBe("<p><strong>bold</strong> and <em>italic</em></p>");
    });

    it("renders underscores as bold and italic too", () => {
        expect(renderMarkdown("__bold__ and _italic_"))
            .toBe("<p><strong>bold</strong> and <em>italic</em></p>");
    });

    it("leaves snake_case_names alone", () => {
        // Common in a task about code, and emphasising their middles would be actively wrong.
        expect(renderMarkdown("check user_calendar_id")).toBe("<p>check user_calendar_id</p>");
    });

    it("renders strikethrough", () => {
        expect(renderMarkdown("~~dropped~~")).toBe("<p><del>dropped</del></p>");
    });

    it("renders inline code, and does not format inside it", () => {
        expect(renderMarkdown("run `npm **run** build`"))
            .toBe("<p>run <code>npm **run** build</code></p>");
    });

    it("renders a bullet list", () => {
        expect(renderMarkdown("- one\n- two"))
            .toBe("<ul><li>one</li><li>two</li></ul>");
    });

    it("renders a numbered list", () => {
        expect(renderMarkdown("1. one\n2. two"))
            .toBe("<ol><li>one</li><li>two</li></ol>");
    });

    it("renders headings, starting at h3", () => {
        // This sits inside a dialog that has its own heading: a description cannot outrank the
        // task it belongs to.
        expect(renderMarkdown("# Title")).toBe("<h3>Title</h3>");
        expect(renderMarkdown("### Deep")).toBe("<h5>Deep</h5>");
    });

    it("renders a quote", () => {
        expect(renderMarkdown("> as agreed")).toBe("<blockquote>as agreed</blockquote>");
    });

    it("renders a rule", () => {
        expect(renderMarkdown("---")).toBe("<hr>");
    });

    it("renders a fenced code block literally", () => {
        expect(renderMarkdown("```\n- not a list\n```"))
            .toBe("<pre><code>- not a list</code></pre>");
    });

    it("closes an unterminated fence rather than swallowing the rest", () => {
        expect(renderMarkdown("```\nstill code")).toBe("<pre><code>still code</code></pre>");
    });
});

describe("how lines become blocks", () => {
    it("treats a single newline as a line break", () => {
        // Not what CommonMark says. It is what somebody typing three things into a box expects —
        // the ambiguity CommonMark resolves the other way exists because it was written for
        // documents.
        expect(renderMarkdown("one\ntwo")).toBe("<p>one<br>two</p>");
    });

    it("starts a new paragraph on a blank line", () => {
        expect(renderMarkdown("one\n\ntwo")).toBe("<p>one</p><p>two</p>");
    });

    it("ends a paragraph when a list starts", () => {
        expect(renderMarkdown("Shopping:\n- milk"))
            .toBe("<p>Shopping:</p><ul><li>milk</li></ul>");
    });

    it("handles carriage returns from a Windows paste", () => {
        expect(renderMarkdown("one\r\ntwo")).toBe("<p>one<br>two</p>");
    });

    it("renders nothing for nothing", () => {
        expect(renderMarkdown("")).toBe("");
        expect(renderMarkdown(null)).toBe("");
        expect(renderMarkdown(undefined)).toBe("");
        expect(renderMarkdown("   \n  \n")).toBe("");
    });

    it("renders a plain description exactly as it always did", () => {
        // Every description written before any of this existed is still valid, and still means
        // what it meant. That is the whole reason the stored value is Markdown text rather than
        // HTML: nothing had to be migrated.
        expect(renderMarkdown("Ring the plumber about the leak"))
            .toBe("<p>Ring the plumber about the leak</p>");
    });
});

describe("whether there is anything to show", () => {
    it("is false for nothing and for whitespace", () => {
        expect(hasMarkdownContent(null)).toBe(false);
        expect(hasMarkdownContent("")).toBe(false);
        expect(hasMarkdownContent("   \n ")).toBe(false);
    });

    it("is true for anything else", () => {
        expect(hasMarkdownContent("a")).toBe(true);
    });
});
