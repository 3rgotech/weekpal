import APITaskAdapter from './api/APITaskAdapter';
import APICategoryAdapter from './api/APICategoryAdapter';
import TestTaskAdapter from './test/TestTaskAdapter';
import TestCategoryAdapter from './test/TestCategoryAdapter';
import { ICategoryAdapter, ITaskAdapter } from '../types';
import { getEnvConfig } from '../utils/env';

interface AdapterFactoryConfig {
    apiUrl?: string;
    dataSource?: string;
    apiKey?: string;
}

interface AdapterFactoryResult {
    taskAdapter: ITaskAdapter | null;
    categoryAdapter: ICategoryAdapter | null;
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
            categoryAdapter: factory.createCategoryAdapter()
        };
    }

    createTaskAdapter(): ITaskAdapter | null {
        // Check if we're in test mode
        if (this.config.dataSource === 'test') {
            return new TestTaskAdapter();
        }

        // Use API adapter if URL is provided
        if (this.config.apiUrl) {
            return new APITaskAdapter(this.config.apiUrl, this.config.apiKey);
        }

        return null;
    }

    createCategoryAdapter(): ICategoryAdapter | null {
        // Check if we're in test mode
        if (this.config.dataSource === 'test') {
            return new TestCategoryAdapter();
        }

        // Use API adapter if URL is provided
        if (this.config.apiUrl) {
            return new APICategoryAdapter(this.config.apiUrl, this.config.apiKey);
        }

        return null;
    }
}

export default AdapterFactory;