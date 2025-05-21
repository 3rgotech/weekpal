type Url = string | undefined;
type DataSource = "api" | "test";
type ApiKey = string | undefined;

export interface EnvConfig {
    baseApiUrl: Url;
    dataSource: DataSource;
    apiKey: ApiKey;
}

export function getEnvConfig(): EnvConfig {
    let baseApiUrl: Url;
    let dataSource: DataSource = "test";
    let apiKey: ApiKey;
    // Try to get API URL from window context first (takes precedence)
    try {
        if (window.API_URL) {
            baseApiUrl = window.API_URL;
            dataSource = "api";
            apiKey = window.API_KEY;
            console.debug("Using API URL from window context:", baseApiUrl);
        }
    } catch (e) {
        console.error("Error accessing window.API_URL:", e);
    }

    // If not found in window context, try environment variables
    if (!baseApiUrl) {
        // Try to get from Vite env vars first, fall back to process.env
        // @ts-ignore - Using import.meta.env which may not be typed properly
        const envApiUrl = import.meta.env.VITE_API_URL || process?.env?.API_URL;
        if (envApiUrl) {
            baseApiUrl = envApiUrl as Url;
            console.debug("Using API URL from env:", baseApiUrl);
        }

        // Get data source from environment variables
        // @ts-ignore - Using import.meta.env which may not be typed properly
        const envDataSource = import.meta.env.VITE_DATA_SOURCE || process?.env?.DATA_SOURCE;
        if (envDataSource) {
            dataSource = envDataSource as DataSource;
            console.debug("Using data source from env:", dataSource);
        }
    }


    return { baseApiUrl, dataSource, apiKey };
}