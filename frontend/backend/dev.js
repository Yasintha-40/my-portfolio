'use strict';
const express = require('express');
const path = require('node:path');
const app = require('./server');
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));
app.listen(process.env.PORT || 8080, () => console.log('Local portfolio server started.'));
