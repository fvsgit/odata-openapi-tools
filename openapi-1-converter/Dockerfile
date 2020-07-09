FROM node:alpine

# Create the build arguments
ARG uid=1001
ARG gid=1001
ARG user=xslt
ARG group=xslt
ARG CLI_HOME=/project
ARG SRC=/src

# Install dependancies and tools
RUN apk --no-cache add g++ gcc libgcc libstdc++ linux-headers make python bash
RUN npm install --quiet node-gyp -g
RUN apk add openjdk8

# Set the JAVA path vaiables
ENV JAVA_HOME=/usr/lib/jvm/java-1.8-openjdk
ENV PATH="$JAVA_HOME/bin:${PATH}" 

# Switch to the SRC directory
WORKDIR ${SRC}

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./  
RUN npm install

# Copy the source code of the xslt tool
COPY . . 

#Setup the user for the container with the needed permissions and directory
RUN mkdir -p $CLI_HOME \
  && chown ${uid}:${gid} $CLI_HOME \
  && chmod 660 $CLI_HOME \
  && addgroup -g ${gid} ${group} \
  && adduser -h "$CLI_HOME" -u ${uid} -G ${group} -s /bin/bash -D ${user}

# Create a volume and working directory
VOLUME ${CLI_HOME}
WORKDIR ${CLI_HOME} 

#ENTRYPOINT ["bash"]

# Set the entry point to node
ENTRYPOINT [ "node" ]

# Set the start command to the CLI and the help parameter
CMD ["/src/transform.js", "-h"]