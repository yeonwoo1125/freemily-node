const Sequelize = require('sequelize');

const User = require('./user');
const Group = require('./group');
const Ingredient = require('./ingredient');
const Quest = require('./quest');
const Chore = require('./chore');


const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.js')[env]
const db = {};

const sequelize = new Sequelize(config.database, config.username, config.password, config);

db.sequelize = sequelize;
db.Group = Group;
db.User = User;
db.Ingredient = Ingredient;
db.Quest = Quest;
db.Chore = Chore;

Group.init(sequelize);
User.init(sequelize);
Ingredient.init(sequelize);
Quest.init(sequelize);
Chore.init(sequelize);

Group.associate(db);
User.associate(db);
Ingredient.associate(db);
Quest.associate(db);
Chore.associate(db);

module.exports = db;