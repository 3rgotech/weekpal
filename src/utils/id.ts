import { v7 as uuidv7 } from 'uuid';

/**
 * Mint an identifier for a new record.
 *
 * The client owns identity. An id is generated here, before the row is written to IndexedDB and
 * long before any backend sees it, which is what makes writes idempotent: the same row can be
 * sent twice — retried from the offline queue, or replayed from another device — and the server
 * converges on one record instead of creating two.
 *
 * It also removes the old two-identifier problem. Records used to carry a local autoincrement
 * `id` *and* a `serverId`, in one keyspace: a locally created task that got autoincrement id 3
 * was silently overwritten when the server sent down its own, different, task 3.
 *
 * v7 rather than v4 because it is time-ordered — it keeps B-tree insert locality on the server
 * and sorts by creation time for free.
 */
export function newId(): string {
    return uuidv7();
}

/** Whether a value looks like an id this application minted. */
export function isId(value: unknown): value is string {
    return typeof value === 'string'
        && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
