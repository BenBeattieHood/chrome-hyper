import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app';

ReactDOM.createRoot(document.body).render(
    //   <React.StrictMode>
    <Suspense>
        <App />
    </Suspense>,
    //   </React.StrictMode>
);
