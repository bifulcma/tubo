import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { FAMIGLIA } from './famiglia';
import { Cancello } from './components/Cancello';
import './index.css';

if (FAMIGLIA) document.title = 'TuboF — video scelti con l’AI';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {FAMIGLIA ? <Cancello><App /></Cancello> : <App />}
  </React.StrictMode>
);
