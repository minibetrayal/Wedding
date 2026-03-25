import { MenuCourse } from "../types/MenuCourse";
import { MenuItem } from "../types/MenuItem";

export interface MenuConnection {
    get(course: string): Promise<MenuCourse>;
    getAll(): Promise<MenuCourse[]>;
    createCourse(course: string): Promise<void>;
    removeCourse(course: string): Promise<void>;
    updateCourse(course: string, items: MenuItem[]): Promise<void>;
}