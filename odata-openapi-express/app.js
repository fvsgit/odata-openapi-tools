const express = require("express");
const bodyparser = require("body-parser");
var cors = require('cors')
const { exec } = require('child_process');
const fs = require("fs");
var addRequestId = require('express-request-id')();
var parser = require('fast-xml-parser');

//Load the .ENV file
require('dotenv').config();

//Create an instance of the express app
const app = express();
const port = process.env.PORT || 3400;

var allowedOrigins = null;
if (process.env.ORIGIN) {

  allowedOrigins = process.env.ORIGIN.split(" ");
  if (allowedOrigins.length >= 1) {
    app.use(cors({
      origin: function (origin, callback) {
        // allow requests with no origin 
        // (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
          var msg = 'The CORS policy for this site does not ' +
            'allow access from the specified Origin.';
          return callback(new Error(msg), false);
        }
        return callback(null, true);
      }
    }));

  } else {
    app.use(cors());
  }

} else {
  app.use(cors());
}

// Setup the usage of the middleware
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));
app.use(addRequestId);

//This function is used to cleanup the temp files that were created during the request
const cleanup = function (sRequestId, sXMLFile, sJSONFile) {

  try {

    console.info(prepareMsg(sRequestId, "cleaning up temp files"));

    //Delete the xml file if it exists
    if (fs.existsSync(sXMLFile))
      fs.unlinkSync(sXMLFile);

    //Delete the json file if it exists
    if (fs.existsSync(sJSONFile))
      fs.unlinkSync(sJSONFile);

    //Delete the temp directory if it exists
    if (fs.existsSync(sRequestId))
      fs.rmdirSync(sRequestId, { recursive: true });

    console.info(prepareMsg(sRequestId, "Cleanup done."));

  } catch (error) {
    console.error(prepareMsg(sRequestId, "Error while cleaning up the tmp files: " + error));
  }

}

const validateRequest = function (req, res, sRequestId) {

  //Check if the body of the request is not empty and that the metadata has been passed
  if (req.body && req.body.metadata) {

    try {
      var jsonObj = parser.parse(req.body.metadata, undefined, true);
    } catch (error) {
      console.info(prepareMsg(sRequestId, "Invalid XML received: " + error.message));
      sendResponse(res, 500, "Invalid XML: " + error.message);
    }

  } else {

    console.info(prepareMsg(sRequestId, "Request not valid"));
    sendResponse(res, 400, "The XML metadata of the odata service needs to be added to the body of the request in the metadata key.");

  }

}

const sendResponse = function (res, status, message) {
  if (!res.writableFinished)
    res.status(status).send(message);
}

const prepareMsg = function (sRequestId, sMsg) {
  return "[" + sRequestId + "] - " + Date.now() + " => " + sMsg;
}

app.post("/convert", (req, res) => {

  try {

    console.info(prepareMsg(requestId, "Processing new request"));

    //Create unique file names based on the current request id
    var requestId = req.id;

    //Generate temp dir for the current request
    var sTmpDir = fs.mkdirSync(requestId);

    var xmlFile = requestId + ".xml";
    var jsonFile = requestId + ".openapi.json";
    var xmlFilePath = "./" + requestId + "/" + xmlFile;
    var jsonFilePath = "./" + requestId + "/" + jsonFile;

    //Validate the request and reject it if it is not complete
    validateRequest(req, res, requestId);

    //Create the XML file with the content padded to this endpoint
    fs.writeFileSync(xmlFilePath, req.body.metadata);
    console.info(prepareMsg(requestId, "Created the file: " + xmlFilePath));

    console.info(prepareMsg(requestId, "Transforming the XML to OAS..." + xmlFilePath));
    exec('node transform -dp ' + xmlFilePath, (error, stdout, stderr) => {
      if (error) {
        console.error(prepareMsg(requestId, "exec error: " + error));
        sendResponse(res, 500, "Could not convert the XML metadata to OAS.");
        cleanup(requestId, xmlFilePath, jsonFilePath);
        return;
      }

      //Check if the matching OAS JSON file was created. If it was, it means the transformation was successful
      if (fs.existsSync(jsonFilePath)) {

        console.info(prepareMsg(requestId, "Transformation to OAS completed. Output file: " + jsonFile));
        var raw = fs.readFileSync(jsonFilePath);
        oasObject = JSON.parse(raw);
        sendResponse(res, 200, oasObject);
        cleanup(requestId, xmlFilePath, jsonFilePath);

      } else {

        console.error(prepareMsg(requestId, "Transformation failed: " + error));
        sendResponse(res, 500, "Could not convert the XML metadata to OAS");
        cleanup(requestId, xmlFilePath, jsonFilePath);
        return;

      }

    });

  } catch (error) {

    console.error(prepareMsg(requestId, "Transformation failed: " + error));
    sendResponse(res, 500, "Could not convert the XML metadata to OAS");
    cleanup(requestId, xmlFilePath, jsonFilePath);

  }

});

app.listen(port, () => {
  console.log("running at port " + port);
});