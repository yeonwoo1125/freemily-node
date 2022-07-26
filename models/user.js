const Sequelize = require('sequelize');

class User extends Sequelize.Model {

    static init(sequelize) {

        return super.init(
            {
                user_id: {
                    primaryKey: true,
                    autoIncrement: true,
                    type: Sequelize.INTEGER
                },
                user_name: {
                    type: Sequelize.STRING(20),
                    allowNull: false
                },
                user_nickname: {
                    type: Sequelize.STRING(20),
                    allowNull: false
                },
                user_password: {
                    type: Sequelize.STRING(60),
                    allowNull: false
                },
                user_email: {
                    type: Sequelize.STRING(50),
                    allowNull: false,
                    unique: true,
                    isEmail: true
                }
            },
            {
                sequelize,
                timestamps: false,
                tableName: 'user_tb',
                modelName: 'User',
                charset: 'utf8',
                collate: 'utf8_general_ci',
            }
        );
    }

    static associate(db) {
        db.User.belongsTo(db.Group, {foreignKey: 'group_id', targetKey: 'group_id'});
        db.User.hasMany(db.Chore, {foreignKey: 'chore_user_id', sourceKey: 'user_id'});
        db.User.hasMany(db.Quest, {foreignKey: 'request_user_id', sourceKey: 'user_id'});
    }

    static async findByEmail(email) {
        return await this.findOne({
            where: {user_email: email}
        });
    }

    static async findByUserId(id) {
        return await this.findByPk(id);
    }

    static userNotFound(user) {
        return user !== null;
    }

    static userNotInGroup(user, groupId) {
        return user.group_id === groupId;
    }

    static alreadyJoinEmail(user) {
        return user === null;
    }

    static userNotFoundByEmail(user) {
        return user !== null;
    }
}

module.exports = User;
