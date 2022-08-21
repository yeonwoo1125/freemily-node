const Quest = require('../models/quest');
const Group = require('../models/group');
const Chore = require('../models/chore');

const moment = require("moment");
const router = require('express').Router();
const Op = require('sequelize').Op;
const sequelize = require('../models/index').sequelize;


router.get('/:group_id', async (req, res) => {
    const groupId = req.params.group_id * 1;
    const group = await findByGroupId(groupId);
    if (group === null) {
        return res.status(404).send({
            message: '해당하는 그룹을 찾을 수 없습니다.'
        });
    }

    const date = new Date(req.query.date);
    if (!validDateFormat(date)) {
        return res.status(400).send({
            message: '날짜 형식이 올바르지 않습니다.'
        });
    }

    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    const king = {};
    let choreKing = [];
    try {
        const list = await Chore.findAll({
            attributes: [['chore_category', 'category'],
                [sequelize.fn('count', '*'), 'count'], ['chore_user_id', 'userId']],
            raw: true,
            group: ['chore_category', 'chore_user_id'],
            where: {
                group_id: groupId,
                chore_check: 'SUCCESS',
                [Op.and]: [
                    sequelize.where(sequelize.fn('year', sequelize.col('chore_date')), '=', year),
                    sequelize.where(sequelize.fn('month', sequelize.col('chore_date')), '=', month)
                ]
            },
            order: [
                [sequelize.fn('count', sequelize.col('*')), 'desc'],
                [sequelize.literal('chore_category'), 'asc']
            ]
        });

        choreKing.push(list[0]);
        for (let i of list) {
            for (let j of choreKing) {
                if (j.category !== i.category) {
                    choreKing.push(i);
                    break;
                }
            }
        }
        king.choreKing = choreKing;

        king.questKing = await Quest.findOne({
            attributes: [[sequelize.fn('count', '*'), 'count'], ['accept_user_id', 'userId']],
            group: ['accept_user_id'],
            where: {
                group_id: groupId,
                complete_check: true,
                [Op.and]: [
                    sequelize.where(sequelize.fn('year', sequelize.col('createdAt')), '=', year),
                    sequelize.where(sequelize.fn('month', sequelize.col('createdAt')), '=', month)
                ]
            }
        });
        res.status(200).json(king);
    } catch (e) {
        console.error(e);
    }
});

const findByGroupId = async (id) => {
    return await Group.findByPk(id);
}

const validDateFormat = (date) => {
    return moment(date, 'YYYY-MM').isValid();
}

module.exports = router;