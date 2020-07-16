FROM adoptopenjdk:8-jdk-hotspot-bionic
LABEL maintainer "Tim Brust <github@timbrust.de>"

ARG NODE_USER_HOME=/home/node
ARG REFRESHED_AT
ARG HTTP_PROXY
ARG HTTPS_PROXY
COPY proxy.conf /etc/apt/apt.conf.d/proxy.conf

ENV REFRESHED_AT $REFRESHED_AT

RUN echo "Proxy {$HTTP_PROXY}"

#Set the HTTP and HTTPS proxies according to the passed in proxy or default
ENV HTTP_PROXY=$HTTP_PROXY
ENV HTTPS_PROXY=$HTTP_PROXY

SHELL ["/bin/bash", "-o", "pipefail", "-c"]
 
RUN curl -sL https://deb.nodesource.com/setup_12.x | bash -
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
RUN apt-get update -qq && apt-get install -qq --no-install-recommends \
    nodejs \
    yarn \ 
    git \
    g++ make python \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --home-dir "${NODE_USER_HOME}" \
    --create-home \
    --shell /bin/bash \
    --user-group \
    --uid 1000 \
    --comment 'OAS tooling' \
    --password "$(echo weUseMta |openssl passwd -1 -stdin)" node

# Create our containers WORKDIR and "node_modules" directory.
# Give the user:group "node" ownership of all files/directories in our containers WORKDIR
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

RUN ls -la
RUN git clone "https://github.com/fvsgit/odata-openapi-tools.git"

RUN cp -r odata-openapi-tools/odata-openapi-express/* /home/node/app

# Tell our container which directory to use as the WORKDIR
WORKDIR /home/node/app  

# Creates a user for our container
USER node

# Installs our NPM packages from the "package.json" file we moved from local in to our container
RUN npm install

# Tells our container who owns the copied content
COPY --chown=node:node . .

# Exposes the port "3000" from our container
# This is also how we can connect to our container from our host machine (the one you're reading this from now)
EXPOSE 3300

# An array of commands our container needs to run when we start it
CMD ["npm", "run", "start"]