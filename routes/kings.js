const Quest = require('../models/quest');
const User = require('../models/user');
const Group = require('../models/group');
const Chore = require('../models/chore');

const moment = require("moment");
const router = require('express').Router();
const Op = require('sequelize').Op;


router.get('/:group_id', async (req, res) => {
    const groupId = req.params.group_id * 1;
    const group = await findByGroupId(groupId);
    if (group === null) {
        return res.status(404).send({
            message: 'Group not found'
        });
    }

    const date = req.query.date;
    if (!validDateFormat(date)) {
        return res.status(400).send({
            message: 'Date format is not valid'
        })
    }

    try {
        const choreKing = await Chore.findOne({
            where : {
                group_id : groupId, chore_date : date, chore_check : true
            }
        });
        console.log(choreKing);
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