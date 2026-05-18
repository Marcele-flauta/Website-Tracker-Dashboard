require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

app.use(require('./routes/data'));
app.use(require('./routes/cell'));
app.use(require('./routes/row'));

app.listen(PORT, () => {
  console.log(`Website Tracker Dashboard → http://localhost:${PORT}`);
});
