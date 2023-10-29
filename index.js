const express = require('express');

const Scrapper = require('./src/scrapper/Scrapper');
const scrapper = new Scrapper();

const app = express();
const port = 8080;

app.get('/api/data', async function(req, res) {
    try {
        const url = decodeURIComponent(req.query.url);

        const data = await scrapper.lePagina(url);
        res.send({
            'data': data
        })

    } catch (err) {
        res.send({
            'erro': err.message
        })
    }
});

app.listen(port);
console.log(`Server started`);