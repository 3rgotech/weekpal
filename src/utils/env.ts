type Url = string | undefined;
type DataSource = "api" | "test" | "demo" | undefined;
type ApiKey = string | undefined;

declare global {
    interface Window {
        API_URL?: string;
        API_KEY?: string;
        DATA_SOURCE?: DataSource;
        /**
         * Where the host application keeps the user's account pages.
         *
         * Set by the Blade view that embeds the board. Absent when the board runs standalone
         * or in demo mode, where there is no account to open — the user button hides itself
         * rather than leading somewhere that does not exist.
         */
        ACCOUNT_URL?: string;
        /**
         * Where a demo visitor goes to get an account of their own.
         *
         * Set only by the demo view. The demo has no account to open, so the board offers to
         * make one instead of hiding the button — see `TopBar`.
         */
        SIGNUP_URL?: string;
        LOGIN_URL?: string;
        /**
         * Where the board asks for a new bearer token when its own expires.
         *
         * Set by the Blade view that embeds the board, and absent in demo and test mode, which
         * have no session to authenticate the ask with. A board without it simply stops writing
         * when its token runs out, which is what happens today.
         */
        TOKEN_URL?: string;
        /**
         * Which build of the board this page loaded.
         *
         * Compared against the build every API response reports. Absent in demo and dev, which
         * disables the fence — a developer running the SPA off Vite against a built backend
         * would otherwise be told to reload continuously.
         */
        BUILD_ID?: string;
    }
}

export interface EnvConfig {
    baseApiUrl: Url;
    dataSource: DataSource;
    apiKey: ApiKey;
    accountUrl: Url;
    signupUrl: Url;
    loginUrl: Url;
    tokenUrl: Url;
    buildId: string | undefined;
}

export function getEnvConfig(): EnvConfig {
    let baseApiUrl: Url;
    let dataSource: DataSource;
    let apiKey: ApiKey;
    let accountUrl: Url;
    let signupUrl: Url;
    let loginUrl: Url;
    let tokenUrl: Url;
    let buildId: string | undefined;

    // Try to get values from window context first (takes precedence)
    try {
        // Check for API_URL and API_KEY
        if (window.API_URL) {
            baseApiUrl = window.API_URL;
            apiKey = window.API_KEY;
            console.debug("Using API URL from window context:", baseApiUrl);
        }

        if (window.ACCOUNT_URL) {
            accountUrl = window.ACCOUNT_URL;
        }

        if (window.SIGNUP_URL) {
            signupUrl = window.SIGNUP_URL;
        }

        if (window.LOGIN_URL) {
            loginUrl = window.LOGIN_URL;
        }

        if (window.TOKEN_URL) {
            tokenUrl = window.TOKEN_URL;
        }

        if (window.BUILD_ID) {
            buildId = window.BUILD_ID;
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

    if (!accountUrl) {
        // @ts-ignore - Using import.meta.env which may not be typed properly
        const envAccountUrl = import.meta.env.VITE_ACCOUNT_URL || (typeof process !== 'undefined' ? process?.env?.ACCOUNT_URL : undefined);
        if (envAccountUrl) {
            accountUrl = envAccountUrl as Url;
        }
    }

    return { baseApiUrl, dataSource, apiKey, accountUrl, signupUrl, loginUrl, tokenUrl, buildId };
}