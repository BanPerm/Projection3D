const express = require('express');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);


app.use(express.static(path.join(__dirname, 'V2-Projection')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'V2-Projection', 'main.html'));
});

server.listen(3000, () => {
    console.log('Server is listening on port 3000');
});
