# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Environment Configuration

The app can be configured using environment variables. Create a `.env` file in the root directory or use environment variables directly.

### Available Environment Variables

- `VITE_DATA_SOURCE`: Determines which adapters to use for data operations. Possible values:
  - `"api"`: Use API adapters that communicate with a backend server
  - `"test"`: Use test adapters that only log operations to the console

- `VITE_API_URL`: The URL of the API endpoint (used when `VITE_DATA_SOURCE` is set to `"api"`)

Example `.env` file:
```
VITE_DATA_SOURCE="api"
VITE_API_URL="http://localhost:3001/api"
```

For testing without a backend, use:
```
VITE_DATA_SOURCE="test"
VITE_API_URL=""
```

## API Integration

The app can operate in two modes:

1. **Standalone Mode**: When no API URL is provided, the app will work with local storage only using IndexedDB.

2. **API-Connected Mode**: When an API URL is provided, the app will synchronize data with the backend API.

### Setting up the API URL

The API URL can be configured in two ways (in order of precedence):

1. **Window Context Variable**: If the app is embedded in the `weekpal-api` project, you can set the API URL in the window context:
   ```javascript
   window.API_URL = 'https://your-api-url.com';
   ```

2. **Environment Variables**: If the window context API_URL is not set, the app will look for these environment variables:
   - `VITE_API_URL`: For Vite-based builds
   - `API_URL`: Legacy fallback

   You can set these in your environment or in a `.env` file.

The window context variable takes precedence over environment variables, allowing the embedding application to control the API endpoint.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
