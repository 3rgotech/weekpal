import HistoryEntry from '../../data/history';
import { IHistoryAdapter } from '../../types';
import { APIBaseAdapter } from './APIBaseAdapter';

class APITaskHistoryAdapter extends APIBaseAdapter implements IHistoryAdapter {
    /** The API already orders newest first, which is how a changelog is read. */
    async list(taskId: string): Promise<HistoryEntry[]> {
        const response = await this.getClient()
            .get(`tasks/${taskId}/history`)
            .json<{ data: any[] }>();

        return (response.data ?? []).map(HistoryEntry.createFromApiData);
    }
}

export default APITaskHistoryAdapter;
