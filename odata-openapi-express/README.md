# OData V2 to OpenAPI v1

The purpose of this tool is to transform [OData V2](http://www.odata.org) CSDL (`$metadata`) XML documents into [OpenAPI](https://github.com/OAI/OpenAPI-Specification) documents.

The tool is exposed as RESt API that runs in a docker container. The API is exposed on port ```3300```

## General Information

The core ingredient is the [`V4-CSDL-to-OpenAPI.xsl`](V4-CSDL-to-OpenAPI.xsl) transformation. It transforms OData CSDL XML Version 4.0 documents into either OpenAPI 3.0.0 or Swagger 2.0 documents.

OData CSDL XML documents conforming to one of the predecessor OData versions 2.0 or 3.0 can be transformed into OData 4.0 with the [`V2-to-V4-CSDL.xsl`](V2-to-V4-CSDL.xsl) transformation.

The two files [`transform.js`](transform.js) and [`transform.cmd`](transform.cmd) are wrapper scripts for Node.js and Windows Command.

The mapping can be fine-tuned via [annotations](../doc/Annotations.md) in the CSDL (`$metadata`) XML documents.

## How to use this image

Run the container in background mode and map the local port 3300 to the exposed port of the container.

```docker run -d -p 3300:3300 ccfc/odata-openapi1-converter```

### How to build this image

Simply clone this repository, and move into the project directory where the docker file is located:

```

git clone https://github.deutsche-boerse.de/dev/sap.cicd-docker-images.git

cd sap.cicd-docker-images/MTA/Cloud-MTA-Build-Tool

```

To perform a basic build, execute:

```docker build -t ccfc/odata-openapi1-converter .```

To perform a build and set the corporate proxy:

```docker build --build-arg proxy=http://proxy.shrd.dbgcloud.io:3128 -t ccfc/odata-openapi1-converter .```

## Using the RESt API

Only one route is exposed in the API:

```host:port/convert```

## Supported Annotations

The mapping can be fine-tuned via [annotations](../doc/Annotations.md) in the CSDL (`$metadata`) XML documents.
