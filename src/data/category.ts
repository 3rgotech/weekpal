import { CategoryColor } from '../types';
import { COLORS } from '../utils/color';
import Base from './base';

class Category extends Base {
    public name: string;
    public color: CategoryColor;
    /**
     * Tasks in this category one day may hold before the column warns, or null for no limit.
     *
     * Null and 0 are not the same thing: no limit means this category is never counted against
     * anything, which is how "cap my work, ignore my hobbies" is expressed.
     */
    public dayLimit: number | null;

    /**
     * Never leaves the account through a shared week.
     *
     * The category is the unit because it is the label already on every task: marking one
     * private is a single decision covering everything filed under it now and later, where a
     * per-task toggle would be a decision made forty times a week and forgotten once.
     */
    public isPrivate: boolean;

    /**
     * Words that pull a calendar event into this category (#36) — "standup", "1:1", "gym".
     *
     * An event whose title contains one takes this category; otherwise it keeps its calendar's.
     * The server does the matching, at sync and whenever these change. Null means the board has
     * not been told (an older copy), which is not the same as an empty list: a null is never sent,
     * so saving a rename cannot wipe keywords the board never knew about.
     */
    public eventKeywords: string[] | null;

    constructor(data: Record<string, any>) {
        super(data);
        this.name = data.name;
        this.color = data.color;
        // Both spellings: the API speaks snake_case, the board camelCase, and this object is
        // built from either side depending on whether it came from the server or from Dexie.
        this.dayLimit = data.dayLimit ?? data.day_limit ?? null;
        this.isPrivate = Boolean(data.isPrivate ?? data.is_private ?? false);
        this.eventKeywords = data.eventKeywords ?? data.event_keywords ?? null;
    }

    getColorClasses() {
        return COLORS[this.color];
    }

    getColorClass(type: "bg" | "bgFaded" | "text" | "border") {
        return this.getColorClasses()[type];
    }
}

export default Category;