require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Behind Azure App Service's reverse proxy in production.
app.set('trust proxy', 1);

// Allow SharePoint / Office to embed this page in an iframe (e.g. via the
// SharePoint Embed web part). 'self' keeps the page usable standalone.
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://*.sharepoint.com https://*.office.com"
  );
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

app.use(require('./routes/data'));
app.use(require('./routes/refresh'));
app.use(require('./routes/cell'));
app.use(require('./routes/row'));
app.use(require('./routes/batch'));

app.listen(PORT, () => {
  console.log(`Website Tracker Dashboard → http://localhost:${PORT}`);
});
