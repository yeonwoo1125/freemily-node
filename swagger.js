const swaggerAutogen = require('swagger-autogen')()

const doc = {
    info: {
        title: 'Freemily',
        description: 'Freemily 백엔드 서버를 nodejs로 재구현한 프로젝트입니다.',
    },
    host: 'localhost:3001',
    schemes: ['http']
};

const outputFile = 'swagger-output.json'
const endpointsFiles = ['app.js']


swaggerAutogen(outputFile, endpointsFiles, doc);