type Url = string | undefined;
type DataSource = "api" | "test" | "demo" | undefined;
type ApiKey = string | undefined;

declare global {
    interface Window {
        API_URL?: string;
        API_KEY?: string;
        DATA_SOURCE?: DataSource;
    }
}

export interface EnvConfig {
    baseApiUrl: Url;
    dataSource: DataSource;
    apiKey: ApiKey;
}

export function getEnvConfig(): EnvConfig {
    let baseApiUrl: Url;
    let dataSource: DataSource;
    let apiKey: ApiKey;

    // Try to get values from window context first (takes precedence)
    try {
        // Check for API_URL and API_KEY
        if (window.API_URL) {
            baseApiUrl = window.API_URL;
            apiKey = window.API_KEY;
            console.debug("Using API URL from window context:", baseApiUrl);
        }

        // Check for DATA_SOURCE independently
        if (window.DATA_SOURCE) {
            dataSource = window.DATA_SOURCE;
            console.debug("Using data source from window context:", dataSource);
        }
    } catch (e) {
        console.error("Error accessing window context:", e);
    }

    // If not found in window context, try environment variables
    if (!baseApiUrl) {
        // Try to get from Vite env vars first, fall back to process.env
        // @ts-ignore - Using import.meta.env which may not be typed properly
        const envApiUrl = import.meta.env.VITE_API_URL || (typeof process !== 'undefined' ? process?.env?.API_URL : undefined);
        if (envApiUrl) {
            baseApiUrl = envApiUrl as Url;
            console.debug("Using API URL from env:", baseApiUrl);
        }
    }

    // Get data source from environment variables if not set from window
    if (!dataSource) {
        // @ts-ignore - Using import.meta.env which may not be typed properly
        const envDataSource = import.meta.env.VITE_DATA_SOURCE || (typeof process !== 'undefined' ? process?.env?.DATA_SOURCE : undefined);
        if (envDataSource) {
            dataSource = envDataSource as DataSource;
            console.debug("Using data source from env:", dataSource);
        }
    }

    return { baseApiUrl, dataSource, apiKey };
}