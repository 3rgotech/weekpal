import { IImportAdapter, ImportSummary } from "../../types";
import { APIBaseAdapter } from "./APIBaseAdapter";

/**
 * Hands a spreadsheet to the server and reports what came of it.
 *
 * The file is not read here at all. The board ships as one UMD bundle, which cannot be
 * code-split, so a spreadsheet parser on this side would be roughly four hundred kilobytes on
 * every load forever — for something most people do once. The server already has a streaming
 * reader, and importing from another app is an online action by definition.
 */
export default class APIImportAdapter extends APIBaseAdapter implements IImportAdapter {
    async upload(file: File): Promise<ImportSummary> {
        const body = new FormData();
        body.append('file', file);

        const response = await this.getClient()
            // No `Content-Type`: the browser has to set it, because only it knows the multipart
            // boundary. The shared client sends `application/json`, which would make the upload
            // arrive as an empty request.
            .post('tasks/import', { body, headers: { 'Content-Type': undefined } })
            .json<{ data: ImportSummary }>();

        return response.data;
    }
}
