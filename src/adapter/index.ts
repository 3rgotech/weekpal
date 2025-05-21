import APITaskAdapter from './api/APITaskAdapter';
import APICategoryAdapter from './api/APICategoryAdapter';
import TestTaskAdapter from './test/TestTaskAdapter';
import TestCategoryAdapter from './test/TestCategoryAdapter';
import { ICategoryAdapter, ITaskAdapter } from '../types';

interface AdapterFactoryConfig {
    apiUrl?: string;
    dataSource?: string;
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
        // Check for API URL and data source from environment variables or window context
        let baseApiUrl: string | undefined;
        let dataSource: string | undefined;

        // Try to get API URL from window context first (takes precedence)
        try {
            if (window.API_URL) {
                baseApiUrl = window.API_URL;
                console.log("Using API URL from window context:", baseApiUrl);
            }
        } catch (e) {
            console.error("Error accessing window.API_URL:", e);
        }

        // If not found in window context, try environment variables
        if (!baseApiUrl) {
            // Try to get from Vite env vars first, fall back to process.env
            // @ts-ignore - Using import.meta.env which may not be typed properly
            const envApiUrl = import.meta.env.VITE_API_URL || process.env.API_URL;
            if (envApiUrl) {
                baseApiUrl = envApiUrl as string;
                console.log("Using API URL from env:", baseApiUrl);
            }
        }

        // Get data source from environment variables
        // @ts-ignore - Using import.meta.env which may not be typed properly
        const envDataSource = import.meta.env.VITE_DATA_SOURCE || process.env.DATA_SOURCE;
        if (envDataSource) {
            dataSource = envDataSource as string;
            console.log("Using data source from env:", dataSource);
        }

        const factory = new AdapterFactory({
            apiUrl: baseApiUrl,
            dataSource: dataSource
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
            return new APITaskAdapter(this.config.apiUrl);
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
            return new APICategoryAdapter(this.config.apiUrl);
        }

        return null;
    }
}

export default AdapterFactory;