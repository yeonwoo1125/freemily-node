const Sequelize = require('sequelize');

class Group extends Sequelize.Model {

    static init(sequelize) {

        return super.init(
            {
                group_id : {
                    primaryKey : true,
                    autoIncrement : true,
                    type : Sequelize.INTEGER
                },
                group_invite_code : {
                    type : Sequelize.CHAR(7),
                    allowNull : false,
                    unique : true
                },
                group_name : {
                    type : Sequelize.STRING(20),
                    allowNull: false
                },
                group_report : {
                    type : Sequelize.STRING(50)
                },
            },
            {
                sequelize,
                timestamps:false,
                tableName : 'group_tb',
                modelName : 'Group',
                charset : 'utf8',
                collate : 'utf8_general_ci'
            }
        );
    }

    static associate(db) {
        db.Group.hasMany(db.User, {foreignKey : 'group_id', sourceKey : 'group_id'});
        db.Group.hasMany(db.Ingredient, {foreignKey : 'group_id', sourceKey : 'group_id'});
        db.Group.hasMany(db.Quest, {foreignKey : 'group_id', sourceKey : 'group_id'});
        db.Group.hasMany(db.Chore, {foreignKey : 'group_id', sourceKey : 'group_id'});
    }
}

module.exports = Group;
