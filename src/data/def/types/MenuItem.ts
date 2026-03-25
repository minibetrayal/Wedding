export class MenuItem {
    name: string;
    tags: MenuTag[];

    constructor(name: string, tags: MenuTag[]) {
        this.name = name;
        this.tags = tags;
    }
}

export enum MenuTag {
    LowGluten = 'Low Gluten',
    Vegetarian = 'Vegetarian',
    Vegan = 'Vegan',
    VeganOption = 'Vegan Option',
    VegetarianOption = 'Vegetarian Option',
    LowGlutenOption = 'Low Gluten Option',
}