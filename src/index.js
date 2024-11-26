import React from 'react';
import ReactDOM from 'react-dom';
import { HashRouter } from 'react-router-dom'
import { unregister } from './registerServiceWorker';
import { Provider } from "mobx-react"
import stores from "./stores"

import './index.css';
import './utils.css';
import './floating-label.css';
import App from './App';

ReactDOM.render((
    <Provider {...stores} >
        <HashRouter>
            <App />
        </HashRouter>
    </Provider> 
  ), document.getElementById('root'));

unregister();
