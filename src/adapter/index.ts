import APITaskAdapter from './api/APITaskAdapter';
import APICategoryAdapter from './api/APICategoryAdapter';
import APIProjectAdapter from './api/APIProjectAdapter';
import APISettingsAdapter from './api/APISettingsAdapter';
import TestTaskAdapter from './test/TestTaskAdapter';
import TestCategoryAdapter from './test/TestCategoryAdapter';
import { ICategoryAdapter, IProjectAdapter, ISettingsAdapter, ITaskAdapter } from '../types';
import { getEnvConfig } from '../utils/env';

interface AdapterFactoryConfig {
    apiUrl?: string;
    dataSource?: string;
    apiKey?: string;
}

interface AdapterFactoryResult {
    taskAdapter: ITaskAdapter | null;
    categoryAdapter: ICategoryAdapter | null;
    projectAdapter: IProjectAdapter | null;
    settingsAdapter: ISettingsAdapter | null;
}

class AdapterFactory {
    private config: AdapterFactoryConfig;

    constructor(config: AdapterFactoryConfig = {}) {
        this.config = config;
    }

    static createAdapters(): AdapterFactoryResult {
        const { baseApiUrl, dataSource, apiKey } = getEnvConfig();

        const factory = new AdapterFactory({
            apiUrl: baseApiUrl,
            dataSource: dataSource,
            apiKey: apiKey
        });

        return {
            taskAdapter: factory.createTaskAdapter(),
            categoryAdapter: factory.createCategoryAdapter(),
            projectAdapter: factory.createProjectAdapter(),
            settingsAdapter: factory.createSettingsAdapter(),
        };
    }

    /** Null adapters mean local-only: no backend is configured, and every write stays queued. */
    private get usesApi(): boolean {
        return this.config.dataSource === 'api' && !!this.config.apiUrl;
    }

    createTaskAdapter(): ITaskAdapter | null {
        if (this.config.dataSource === 'test') {
            return new TestTaskAdapter();
        }

        return this.usesApi ? new APITaskAdapter(this.config.apiUrl!, this.config.apiKey) : null;
    }

    createCategoryAdapter(): ICategoryAdapter | null {
        if (this.config.dataSource === 'test') {
            return new TestCategoryAdapter();
        }

        return this.usesApi ? new APICategoryAdapter(this.config.apiUrl!, this.config.apiKey) : null;
    }

    /**
     * Settings are read straight from the API rather than through a store: they are
     * a single small object, and the SettingsProvider already keeps a local copy in
     * localStorage for offline reads.
     */
    createSettingsAdapter(): ISettingsAdapter | null {
        return this.usesApi ? new APISettingsAdapter(this.config.apiUrl!, this.config.apiKey) : null;
    }

    createProjectAdapter(): IProjectAdapter | null {
        // No test double: nothing reads projects yet, so a fixture backend would only be
        // guessing at what the UI will need.
        return this.usesApi ? new APIProjectAdapter(this.config.apiUrl!, this.config.apiKey) : null;
    }
}

export default AdapterFactory;
