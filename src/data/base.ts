class Base {
    public id: number | undefined;
    public serverId: number | undefined;

    constructor(data: Record<string, any>) {
        this.id = data.id ?? undefined;
        this.serverId = data.serverId ?? undefined;
    }
}

export default Base;