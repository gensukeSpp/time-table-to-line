import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as TopRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';

import { Index } from './components';

ReactDOM.createRoot(document.getElementById('root')!).render(
  // [SOLVED] useRoutes() may be used only in the context of a Router | How to use useRoutes in Reactjs?
  // https://www.youtube.com/watch?v=6uQ5gwd8QGY
  <TopRouter>
    <React.StrictMode>
      <MantineProvider>
        <Index />
      </MantineProvider>
    </React.StrictMode>
  </TopRouter>,
);