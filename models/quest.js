const Sequelize = require('sequelize');

class Quest extends Sequelize.Model {

    static init(sequelize) {

        return super.init(
            {
                quest_id : {
                    primaryKey : true,
                    autoIncrement : true,
                    type : Sequelize.INTEGER
                },
                quest_title : {
                    type : Sequelize.STRING(20),
                    allowNull : false
                },
                quest_content : {
                    type : Sequelize.STRING(100),
                    allowNull: false
                },
                accept_user_id : {
                    type : Sequelize.INTEGER,
                    allowNull : false,
                    defaultValue : -1
                },
                complete_check : {
                    type : Sequelize.BOOLEAN,
                    allowNull : false
                }
            },
            {
                sequelize,
                timestamps:false,
                tableName : 'quest_tb',
                modelName : 'Quest',
                charset : 'utf8',
                collate : 'utf8_general_ci',
                defaultScope : {
                    where : {
                        quest_id : true
                    }
                }
            }
        );
    }

    static associate(db) {
        db.Quest.belongsTo(db.Group, {foreignKey : 'group_id', targetKey : 'group_id'});
        db.Quest.belongsTo(db.User, {foreignKey : 'request_user_id', targetKey : 'user_id'});
    }
}

module.exports = Quest;
