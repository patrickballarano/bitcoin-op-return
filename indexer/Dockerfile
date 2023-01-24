FROM node:19-alpine

RUN mkdir -p /usr/app
WORKDIR /usr/app
COPY package.json tsconfig.json ./
COPY scripts ./scripts
COPY src ./src
RUN npm install 

RUN npm run compile
CMD npm run indexer