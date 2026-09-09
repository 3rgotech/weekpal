/**
 * Make a reordered list travel rather than teleport.
 *
 * *(rt §3)* "It travels; it does not teleport." When the completion re-sort setting is on, a
 * ticked task moves to the bottom of its column and every card below it moves up — and a jump
 * cut through that is the moment people lose track of which card was theirs. Six rows changing
 * place instantly reads as the list having been replaced; the same six sliding reads as one card
 * moving.
 *
 * FLIP, in the ordinary sense: remember where every row **was**, let React put them where they
 * now **are**, then start each one at the difference and let it transition to nothing. Nothing is
 * measured twice and no layout is forced beyond the one read.
 *
 * Linear, 220ms, no overshoot — paper does not bounce.
 *
 * @see PROGRESS.md R6
 */

/** Where each row sat, keyed by whatever identity the caller uses. */
export type Positions = Map<string, number>;

/**
 * Read the current vertical offset of every keyed child.
 *
 * `offsetTop` rather than `getBoundingClientRect`: it is relative to the offset parent, so a
 * column that is itself scrolled does not report every row as having moved when it has not.
 */
export function readPositions(container: HTMLElement | null): Positions {
    const positions: Positions = new Map();

    if (!container) {
        return positions;
    }

    for (const child of Array.from(container.children)) {
        const key = (child as HTMLElement).dataset.flipKey;

        if (key) {
            positions.set(key, (child as HTMLElement).offsetTop);
        }
    }

    return positions;
}

/**
 * Move each row back to where it was, then let it travel to where it is.
 *
 * Rows that did not move are skipped entirely rather than given a zero-length transition — a
 * column of forty cards should not repaint because one of them was ticked.
 */
export function playFlip(container: HTMLElement | null, before: Positions): void {
    if (!container || before.size === 0) {
        return;
    }

    for (const child of Array.from(container.children)) {
        const element = child as HTMLElement;
        const key = element.dataset.flipKey;

        if (!key) {
            continue;
        }

        const previous = before.get(key);

        if (previous === undefined) {
            // A row that has just arrived has nowhere to travel from. Sliding it in from an
            // invented position would be an animation about nothing.
            continue;
        }

        const delta = previous - element.offsetTop;

        if (delta === 0) {
            continue;
        }

        element.classList.remove("task-travelling");
        element.style.transform = `translateY(${delta}px)`;

        // Two frames: one to let the browser accept the starting transform as the current value,
        // and one to change it. A single frame leaves the transition with nothing to interpolate
        // from and the row simply appears in place.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                element.classList.add("task-travelling");
                element.style.transform = "";
            });
        });
    }
}
