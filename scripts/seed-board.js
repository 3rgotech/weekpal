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
 *   await boards()              // which boards exist, and what is in them
 *   useBoard('WeekpalDB_test')  // pick one, if there is more than one
 *   await seedSomeday(120)      // 120 undated tasks, enough to cross VIRTUALISE_ABOVE (60)
 *   await seedDay(1, 80)        // 80 tasks on Monday of the current week
 *   await clearSeeded()         // remove them all again
 *   await counts()              // what is in there now
 *
 * The board keeps a separate database per data source — `WeekpalDB` for a real account,
 * `WeekpalDB_test` and `WeekpalDB_demo` for the two fixture modes — so more than one usually
 * exists, and seeding the wrong one looks exactly like seeding nothing. When there is a choice,
 * these refuse to guess and ask you to name it.
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

/** Set by {@link useBoard}. Null means "work it out, and refuse if it is ambiguous". */
let chosenBoard = null;

/** Name the database to work on, when the browser holds more than one. */
function useBoard(name) {
    chosenBoard = name;

    return `Seeding ${name}.`;
}

async function boardNames() {
    const databases = await indexedDB.databases();

    return databases.map((d) => d.name).filter((name) => name && name.startsWith('WeekpalDB'));
}

async function resolveBoard() {
    if (chosenBoard) {
        return chosenBoard;
    }

    const names = await boardNames();

    if (names.length === 0) {
        throw new Error('No WeekpalDB found — open the board first.');
    }

    // Picking the first would be a coin toss, and a lost one looks identical to the seeder
    // silently doing nothing: the rows land in a database the running board is not reading.
    if (names.length > 1) {
        throw new Error(
            `More than one board here: ${names.join(', ')}. `
            + `Say which — useBoard('${names[0]}') — then run this again. `
            + 'Run boards() to see what is in each.',
        );
    }

    return names[0];
}

/** Every board in this browser, with what is in it, so the right one can be told apart. */
async function boards() {
    const names = await boardNames();
    const summary = [];

    for (const name of names) {
        const db = await openNamed(name);
        const someday = await readAll(rows(db, 'somedayTasks'));
        const weekly = await readAll(rows(db, 'weeklyTasks'));

        db.close();
        summary.push({ name, someday: someday.length, weekly: weekly.length });
    }

    return summary;
}

function openNamed(name) {
    const request = indexedDB.open(name);

    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function openBoardDb() {
    return openNamed(await resolveBoard());
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

    // Every read finishes before the writing transaction is opened, and nothing is awaited once
    // it is. IndexedDB commits a transaction the moment control returns to the event loop with no
    // request outstanding, so an `await` between opening one and using it kills it — which is
    // exactly what `TransactionInactiveError` means.
    const existing = (await readAll(rows(db, 'somedayTasks'))).length;
    const store = rows(db, 'somedayTasks', 'readwrite');

    for (let i = 0; i < count; i++) {
        store.put(taskRecord(
            SEED_PREFIX + String(i).padStart(12, '0'),
            `Seeded task ${i + 1}`,
            { order: existing + i },
        ));
    }

    await new Promise((resolve) => { store.transaction.oncomplete = resolve; });

    const where = db.name;
    db.close();

    return `Added ${count} Some day tasks to ${where}. Reload the board.`;
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

    const where = db.name;
    db.close();

    return `Added ${count} tasks to day ${dayOfWeek} of ${weekCode} in ${where}. Reload the board.`;
}

async function clearSeeded() {
    const db = await openBoardDb();
    let removed = 0;

    for (const table of ['somedayTasks', 'weeklyTasks']) {
        // Read first, then open the writing transaction — see the note in `seedSomeday`.
        const all = await readAll(rows(db, table));
        const mine = all.filter((task) => String(task.id).startsWith(SEED_PREFIX));

        if (mine.length === 0) {
            continue;
        }

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
    const board = db.name;

    db.close();

    return {
        board,
        someday: someday.length,
        weekly: weekly.length,
        seeded: [...someday, ...weekly].filter((t) => String(t.id).startsWith(SEED_PREFIX)).length,
        thisWeek: isoWeek(),
    };
}

console.log('Seeder ready: boards() · useBoard(name) · seedSomeday(120) · seedDay(1, 80) · clearSeeded() · counts()');
