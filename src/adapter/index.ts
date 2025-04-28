import APITaskAdapter from './api/APITaskAdapter';
import APICategoryAdapter from './api/APICategoryAdapter';
import { ICategoryAdapter, ITaskAdapter } from '../types';

interface AdapterFactoryConfig {
    apiUrl?: string;
}

class AdapterFactory {
    private config: AdapterFactoryConfig;

    constructor(config: AdapterFactoryConfig = {}) {
        this.config = config;
    }

    createTaskAdapter(): ITaskAdapter | null {
        if (this.config.apiUrl) {
            return new APITaskAdapter(this.config.apiUrl);
        }
        // TODO : supabase adapter
        return null;
    }

    createCategoryAdapter(): ICategoryAdapter | null {
        if (this.config.apiUrl) {
            return new APICategoryAdapter(this.config.apiUrl);
        }
        // TODO : supabase adapter
        return null;
    }
}

export default AdapterFactory;