export interface NamesConnection {
    getNames(): Promise<string>;
    setNames(names: string): Promise<void>;
    getNamesShort(): Promise<string>;
    setNamesShort(namesShort: string): Promise<void>;
    getContactName(): Promise<string>;
    setContactName(contactName: string): Promise<void>;
    getContactPhone(): Promise<string>;
    setContactPhone(contactPhone: string): Promise<void>;
}