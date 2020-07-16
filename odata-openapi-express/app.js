const express = require("express");
const bodyparser = require("body-parser");
const { exec } = require('child_process');
const fs = require("fs");
var addRequestId = require('express-request-id')();
var parser = require('fast-xml-parser');

//Create an instance of the express app
const app = express();
const port = process.env.PORT || 3400;

// Setup the usage of the middleware
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));
app.use(addRequestId);

//This function is used to cleanup the temp files that were created during the request
const cleanup = function (sRequestId, sXMLFile, sJSONFile) {

  try {

    console.info(prepareMsg(sRequestId, "cleaning up temp files"));

    //Check id the xml file exists. If it exists, delete it
    if (fs.existsSync(sXMLFile)) {
      fs.unlinkSync(sXMLFile);
      console.info(prepareMsg(sRequestId, "Deleted file: " + sXMLFile));
    }

    //Check id the json file exists. If it exists, delete it
    if (fs.existsSync(sJSONFile)) {
      fs.unlinkSync(sJSONFile);
      console.info(prepareMsg(sRequestId, "Deleted file: " + sJSONFile));
    }

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

    //Create unique file names based on the current request id
    var requestId = req.id;
    var xmlFile = requestId + ".xml";
    var jsonFile = requestId + ".openapi.json";
    var xmlFilePath = "./tmp/" + xmlFile;
    var jsonFilePath = "./tmp/" + jsonFile;

    //Validate the request and reject it if it is not complete
    validateRequest(req, res, requestId);

    console.info(prepareMsg(requestId, "Processing new request"));

    //Check if the tmp directory exists, if not whe have to create it
    if (!fs.existsSync("./tmp")) {
      fs.mkdirSync("./tmp");
    }

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