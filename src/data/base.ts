class Base {
    public id: number | undefined;
    public serverId: number | undefined;

    public upToDate: boolean;

    constructor(data: Record<string, any>) {
        this.id = data.id ?? undefined;
        this.serverId = data.serverId ?? undefined;
        this.upToDate = true;
    }

    get dirty() {
        return !this.upToDate;
    }

    get phantom() {
        return this.serverId === undefined;
    }
}

export default Base;