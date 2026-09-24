import React, { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "./css/index.css";
// Plus Jakarta Sans for the standalone dev server only. Embedded, the board is served by
// weekpal-api, which hosts the font itself: a library build would inline every face as base64
// into weekpal.css.
import "@fontsource-variable/plus-jakarta-sans/wght.css";
import App from "./App";
// import reportWebVitals from "./reportWebVitals";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
