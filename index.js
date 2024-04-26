require("dotenv").config();

const express = require('express');

const Scrapper = require('./src/scrapper/Scrapper');
const scrapper = new Scrapper();

const app = express();

var port = 0;
if (process.env.NODE_ENV !== 'production') {
    port = 9090;
    console.log('rodando em ambiente de teste.');
} else {
    port = 8080;
    console.log('rodando em ambiente de producão.');
}

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
console.log(`Server ouvindo na porta ${port}`);