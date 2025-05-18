
const express = require('express')
const app = express()
const port = 8080


app.get('/info', (req, res) => {
    res.send('NodeJS - Express - No Database')
})

app.get('/dept', async (req, res) => {
    let rows = [ 
        { "deptno": "10", "dname": "ACCOUNTING", "loc": "Seoul"}, 
        { "deptno": "20", "dname": "RESEARCH", "loc": "Cape Town"}, 
        { "deptno": "30", "dname": "SALES", "loc": "Brussels"}, 
        { "deptno": "40", "dname": "OPERATIONS", "loc": "San Francisco"} 
    ];
    res.send(rows)
})

app.listen(port, () => {
    console.log(`OCI Starter: listening on port ${port}`)
})