const Sequelize = require('sequelize');

class Ingredient extends Sequelize.Model {

    static init(sequelize) {
        return super.init(
            {
                ingredient_id : {
                    primaryKey : true,
                    autoIncrement : true,
                    type : Sequelize.INTEGER
                },
                ingredient_name : {
                    type : Sequelize.STRING(30),
                    allowNull : false
                },
                ingredient_count : {
                    type : Sequelize.STRING(10),
                    allowNull: false
                },
                ingredient_save_type : {
                    type : Sequelize.CHAR(10),
                    allowNull : false
                },
                ingredient_category : {
                    type : Sequelize.CHAR(15),
                    allowNull : false
                },
                ingredient_purchase_date : {
                    type : Sequelize.DATE,
                    allowNull : false
                },
                ingredient_expiration_date : {
                    type : Sequelize.DATE,
                    allowNull : false
                },
                ingredient_memo : {
                    type : Sequelize.STRING(100),
                    allowNull : false
                }
            },
            {
                sequelize,
                timestamps:true,
                tableName : 'ingredient_tb',
                modelName : 'Ingredient',
                charset : 'utf8',
                collate : 'utf8_general_ci',
                defaultScope : {
                    where : {
                        ingredient_id : true
                    }
                }
            }
        );
    }

    static associate(db) {
        db.Ingredient.belongsTo(db.Group, {foreignKey : 'group_id', targetKey : 'group_id'});
    }
}

module.exports = Ingredient;
