import { CategoryColor } from '../types';
import { COLORS } from '../utils/color';
import Base from './base';

class Category extends Base {
    public name: string;
    public color: CategoryColor;

    constructor(data: Record<string, any>) {
        super(data);
        this.name = data.name;
        this.color = data.color;
    }

    getColorClasses() {
        return COLORS[this.color];
    }
}

export default Category;