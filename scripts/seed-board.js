/**
 * Fill a board with enough tasks to test the long-column behaviour, from the browser console.
 *
 * Paste the whole file into devtools on the board you want to seed, then call one of the
 * functions it defines. It writes straight to IndexedDB, so reload afterwards for the board to
 * pick the rows up.
 *
 * Everything it creates is marked — ids begin with `SEED_PREFIX` — so `clearSeeded()` removes
 * exactly what was added and leaves your own tasks alone. Nothing here clears a table, and
 * nothing touches localStorage.
 *
 *   await seedSomeday(120)      // 120 undated tasks, enough to cross VIRTUALISE_ABOVE (60)
 *   await seedDay(1, 80)        // 80 tasks on Monday of the current week
 *   await clearSeeded()         // remove them all again
 *   await counts()              // what is in there now
 */

const SEED_PREFIX = '01f00000-0000-7000-8000-';

/** The board's own week code for a date: ISO week-year and week, as `2026w37`. */
function isoWeek(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    // Thursday decides the week-year, which is the whole of the ISO rule.
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);

    return `${d.getUTCFullYear()}w${String(week).padStart(2, '0')}`;
}

async function openBoardDb() {
    const databases = await indexedDB.databases();
    const name = databases.find((d) => d.name && d.name.startsWith('WeekpalDB'))?.name;

    if (!name) {
        throw new Error('No WeekpalDB found — open the board first.');
    }

    const request = indexedDB.open(name);

    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function rows(db, table, mode = 'readonly') {
    return db.transaction([table], mode).objectStore(table);
}

function readAll(store) {
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * A record shaped the way the board's own rows are.
 *
 * `createdAt` is an ISO string: `Task` parses either that or the dayjs object Dexie may have
 * stored, so this is the form that is safe to write by hand. The Some day list also filters on it
 * — a row created "after" the week being viewed is hidden — so it is backdated rather than left
 * to now.
 */
function taskRecord(id, title, extra = {}) {
    return {
        id,
        title,
        description: null,
        order: 0,
        completedAt: null,
        updatedAt: null,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        categoryId: null,
        projectId: null,
        subtasks: [],
        ...extra,
    };
}

async function seedSomeday(count = 120) {
    const db = await openBoardDb();
    const store = rows(db, 'somedayTasks', 'readwrite');
    const existing = (await readAll(rows(db, 'somedayTasks'))).length;

    for (let i = 0; i < count; i++) {
        store.put(taskRecord(
            SEED_PREFIX + String(i).padStart(12, '0'),
            `Seeded task ${i + 1}`,
            { order: existing + i },
        ));
    }

    await new Promise((resolve) => { store.transaction.oncomplete = resolve; });
    db.close();

    return `Added ${count} Some day tasks. Reload the board.`;
}

/** `dayOfWeek` is ISO: 1 is Monday, 7 is Sunday. */
async function seedDay(dayOfWeek = 1, count = 80, weekCode = isoWeek()) {
    const db = await openBoardDb();
    const store = rows(db, 'weeklyTasks', 'readwrite');

    for (let i = 0; i < count; i++) {
        store.put(taskRecord(
            `${SEED_PREFIX}${dayOfWeek}${String(i).padStart(11, '0')}`,
            `Seeded day task ${i + 1}`,
            { weekCode, dayOfWeek: String(dayOfWeek), order: i },
        ));
    }

    await new Promise((resolve) => { store.transaction.oncomplete = resolve; });
    db.close();

    return `Added ${count} tasks to day ${dayOfWeek} of ${weekCode}. Reload the board.`;
}

async function clearSeeded() {
    const db = await openBoardDb();
    let removed = 0;

    for (const table of ['somedayTasks', 'weeklyTasks']) {
        const all = await readAll(rows(db, table));
        const mine = all.filter((task) => String(task.id).startsWith(SEED_PREFIX));
        const store = rows(db, table, 'readwrite');

        mine.forEach((task) => { store.delete(task.id); removed++; });
        await new Promise((resolve) => { store.transaction.oncomplete = resolve; });
    }

    db.close();

    return `Removed ${removed} seeded tasks — anything you made yourself is untouched. Reload.`;
}

async function counts() {
    const db = await openBoardDb();
    const someday = await readAll(rows(db, 'somedayTasks'));
    const weekly = await readAll(rows(db, 'weeklyTasks'));

    db.close();

    return {
        someday: someday.length,
        weekly: weekly.length,
        seeded: [...someday, ...weekly].filter((t) => String(t.id).startsWith(SEED_PREFIX)).length,
        thisWeek: isoWeek(),
    };
}

console.log('Seeder ready: seedSomeday(120) · seedDay(1, 80) · clearSeeded() · counts()');
