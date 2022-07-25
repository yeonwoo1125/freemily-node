const Sequelize = require('sequelize');

class Chore extends Sequelize.Model {

    static init(sequelize) {

        return super.init(
            {
                chore_id : {
                    primaryKey : true,
                    autoIncrement : true,
                    type : Sequelize.INTEGER
                },
                chore_title : {
                    type : Sequelize.STRING(20),
                    allowNull : false
                },
                chore_category : {
                    type : Sequelize.CHAR(20),
                    allowNull: false
                },
                chore_date : {
                    type : Sequelize.DATE,
                    allowNull : false
                },
                chore_check : {
                    type : Sequelize.CHAR(7),
                    allowNull : false
                }
            },
            {
                sequelize,
                timestamps:true,
                tableName : 'chore_tb',
                modelName : 'Chore',
                charset : 'utf8',
                collate : 'utf8_general_ci',
                defaultScope : {
                    where : {
                        chore_id : true
                    }
                }
            }
        );
    }

    static associate(db) {
        db.Chore.belongsTo(db.Group, {foreignKey : 'group_id', targetKey : 'group_id'});
        db.Chore.belongsTo(db.User, {foreignKey : 'chore_user_id', targetKey : 'user_id'});
    }
}

module.exports = Chore;
