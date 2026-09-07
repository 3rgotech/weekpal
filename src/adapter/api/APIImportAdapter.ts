import { IImportAdapter, ImportSummary } from "../../types";
import { APIBaseAdapter } from "./APIBaseAdapter";

/**
 * A sheet the server would not read, carrying the headings it did not recognise.
 *
 * Those words are the whole diagnosis — they are what goes into `weekpal.import.aliases` to make
 * the next file of that shape work — so they travel with the failure rather than being swallowed
 * by a generic error.
 */
export class ImportRefused extends Error {
    constructor(public readonly unmatched: string[]) {
        super("The import was refused.");
        this.name = "ImportRefused";
    }
}

/**
 * Hands a spreadsheet to the server and reports what came of it.
 *
 * The file is not read here at all. The board ships as one UMD bundle, which cannot be
 * code-split, so a spreadsheet parser on this side would be roughly four hundred kilobytes on
 * every load forever — for something most people do once. The server already has a streaming
 * reader, and importing from another app is an online action by definition.
 */
export default class APIImportAdapter extends APIBaseAdapter implements IImportAdapter {
    async preview(file: File): Promise<ImportSummary> {
        return this.send(file, true);
    }

    async upload(file: File): Promise<ImportSummary> {
        return this.send(file, false);
    }

    private async send(file: File, dryRun: boolean): Promise<ImportSummary> {
        const body = new FormData();
        body.append('file', file);

        if (dryRun) {
            body.append('dry_run', '1');
        }

        const response = await this.getClient()
            // No `Content-Type`: the browser has to set it, because only it knows the multipart
            // boundary. The shared client sends `application/json`, which would make the upload
            // arrive as an empty request.
            .post('tasks/import', {
                body,
                // No `Content-Type`: only the browser knows the multipart boundary, and the
                // shared client's `application/json` would make the upload arrive empty.
                headers: { 'Content-Type': undefined },
                // ky throws on a 4xx before the body is read, and the refusal's body is the
                // useful part — it names the headings the sheet actually had.
                throwHttpErrors: false,
            });

        const payload = await response.json<{ data?: ImportSummary; unmatched?: string[] }>();

        if (!response.ok) {
            throw new ImportRefused(payload.unmatched ?? []);
        }

        return payload.data as ImportSummary;
    }
}
