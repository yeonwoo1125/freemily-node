require('dotenv').config();
const env = process.env;

const development = {
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
  host: env.DB_HOST,
  dialect: "mysql",
  timezone : '+09:00',
  dialectOptions : {
    dateStrings : true,
    typeCast : true
  }
};

const production = {
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
  host: env.DB_HOST,
  dialect: "mysql",
  timezone : '+09:00',
  dialectOptions : {
    dateStrings : true,
    typeCast : true
  }
};

const test = {
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
  host: env.DB_HOST,
  dialect: "mysql",
  timezone : '+09:00',
  dialectOptions : {
    dateStrings : true,
    typeCast : true
  }
};

module.exports = { development, production, test };