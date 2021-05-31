# Meow Server

Table of Contents
- [Meow Server](#meow-server)
  - [Technologies](#technologies)
  - [Getting started](#getting-started)
    - [Requirements](#requirements)


## Technologies
Technologies that I used to develop the REST API

- [Node.js](https://nodejs.org/en/)
- [Express](https://expressjs.com/)
- [MySQL](https://www.mysql.com/)
- [Prisma](https://www.prisma.io/)
- [Mocha](https://mochajs.org/)
- [Chai](https://www.chaijs.com/)
- [JWT](https://jwt.io/)

## Getting started
### Requirements
- [Node.js](https://nodejs.org/en/)
- [npm](https://www.npmjs.com/)
- One instance of [MySQL](https://www.mysql.com/)

1. Clone the project and access the folder
```
git clone https://github.com/mohannadzidan/meow-server
```
2. install dependencies
```bash
npm install
```
3. Create the database using the sql queries at [create-database.sql](/mysql/create-database.sql)
4. Create `.env` file inside the project folder
```ini
SECRET = {YOUR_PRIVATE_KEY}
MEOW_SERVER_ADDRESS = {IP_ADDRESS}
MEOW_SERVER_PORT = {PORT}
DATABASE_URL = mysql://{USERNAME}:{PASSWORD}@localhost:3306/meowdb
# set node_env to development or production
NODE_ENV = development
``` 
5. run the server
```bash
npm run server
# or for development with nodemon
npm run start
```
6. run the tests
```bash
npm run test
```
REST API reference in [wiki](https://github.com/mohannadzidan/meow-server/wiki/Overview)
