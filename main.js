/*jshint node:true*/
/*jslint node:true*/
var express = require('express');
var app = express();

app.use('/sound', express.static(__dirname+'/sound'));
app.use(express.static(__dirname +'/public'));

app.listen(3000);