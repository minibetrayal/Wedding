import { MenuItem } from "./MenuItem";

export class MenuCourse {
    name: string;
    items: MenuItem[];

    constructor(name: string, items: MenuItem[]) {
        this.name = name;
        this.items = items;
    }
}