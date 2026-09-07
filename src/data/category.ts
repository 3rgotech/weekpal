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

    constructor(data: Record<string, any>) {
        super(data);
        this.name = data.name;
        this.color = data.color;
        // Both spellings: the API speaks snake_case, the board camelCase, and this object is
        // built from either side depending on whether it came from the server or from Dexie.
        this.dayLimit = data.dayLimit ?? data.day_limit ?? null;
    }

    getColorClasses() {
        return COLORS[this.color];
    }

    getColorClass(type: "bg" | "bgFaded" | "text" | "border") {
        return this.getColorClasses()[type];
    }
}

export default Category;