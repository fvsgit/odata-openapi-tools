const express = require("express");
const fs = require("fs");
const { exec } = require('child_process');
const xmlparser = require('express-xml-bodyparser');
var convert = require('xml-js');

const rp = require("request-promises");
var addRequestId = require('express-request-id')();

const app = express();
const bodyparser = require("body-parser");
const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require("constants");

const port = process.env.PORT || 3200;

// middleware

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));
app.use(xmlparser());
app.use(addRequestId);

app.get("/oas", (req, res) => {

  var requestId = req.id;
  var xmlFile = requestId + ".xml";
  var jsonFile = requestId + ".openapi.json";
  var xmlFilePath = "./" + xmlFile;
  var jsonFilePath = "./" + jsonFile;

  if (fs.existsSync(xmlFilePath)) {
    fs.unlinkSync(xmlFilePath);
  }

  if (fs.existsSync(jsonFilePath)) {
    fs.unlinkSync(jsonFilePath);
  }

  rp('https://services.odata.org/V2/Northwind/Northwind.svc/$metadata')
    .then(function (xmlMetadata) {
      // Process html...

      fs.writeFileSync(xmlFilePath, xmlMetadata.body);
      if (fs.existsSync(xmlFilePath)) {

        exec('node transform -dp ' + xmlFile, (error, stdout, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`);
            return;
          }
          console.log(`stdout: ${stdout}`);
          console.error(`stderr: ${stderr}`);

          if (fs.existsSync(jsonFile)) {
            
            var raw = fs.readFileSync(jsonFilePath);
            oasObject = JSON.parse(raw);
            res.status(200).send(oasObject);

          }else{

          }

        });

      } else {

      }

    }.bind(this))
    .catch(function (err) {
      // Crawling failed...
    });

  
});

app.post('/xmltest', function(req, res, next) {
  
  result = convert.js2xml(req.body, {compact: true, spaces: 1}); 
 
});

app.listen(port, () => {
  console.log(`running at port ${port}`);
});