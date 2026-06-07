import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './index.css';

// amplify_outputs.json is generated after you run: npx ampx sandbox
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let outputs: any = {};
try {
  // Dynamic import so the app still loads in development before the file exists
  outputs = await import('../amplify_outputs.json').catch(() => ({}));
} catch { /* file not generated yet */ }

if (Object.keys(outputs).length > 0) {
  Amplify.configure(outputs);
} else {
  console.warn(
    '[Jaguraga] amplify_outputs.json not found. Run `npx ampx sandbox` to deploy the backend first.',
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
