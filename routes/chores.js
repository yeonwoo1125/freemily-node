const Group = require('../models/group');
const Chore = require('../models/chore');
const User = require("../models/user");
const {validationResult, check} = require("express-validator");
const router = require('express').Router();
const Op = require('sequelize').Op;

const choreCategorys = {
    DISH_WASHING: '설거지',
    SHOPPING: '장보기',
    COOK: '요리'
};
Object.freeze(choreCategorys);

const choreChecks = {
    BEFORE: '인증 요청 전',
    REQUEST: '인증 요청',
    SUCCESS: '수락',
    FAIL: '거절'
};
Object.freeze(choreChecks);


//당번 생성
router.post('/:group_id/:user_id', [
    check('choreTitle', 'Title is empty').trim().not().isEmpty(),
    check('choreCategory', 'Category is empty').trim().not().isEmpty(),
    check('choreDate', 'Date format is not valid').trim().isDate(),
    check('choreUserId', 'UserId is empty').trim().not().isEmpty()
], async (req, res) => {

    const err = validationResult(req);
    if (validRequest(err)) {
        return res.status(400).send({
            message: err.array()[0].msg,
        });
    }

    const groupId = req.params.group_id * 1;
    if (!await findByGroupId(groupId)) {
        return res.status(404).send({
            message: 'Group Not Found'
        });
    }

    const userId = req.params.user_id * 1;
    const user = await findByUserId(userId);
    if (user === null) {
        return res.status(404).send({
            message: 'User not found'
        });
    }

    if (user.group_id !== groupId) {
        return res.status(404).send({
            message: 'User is not joined to this group'
        });
    }

    let {choreTitle, choreCategory, choreDate, choreUserId} = req.body;
    if (!validEnum(choreCategorys, choreCategory)) {
        return res.status(404).send({
            message: 'Not in valid category enum'
        });
    }

    const choreUser = await findByUserId(userId);
    if (choreUser === null) {
        return res.status(404).send({
            message: 'Chore user not found'
        });
    }

    if (choreUserId.group_id !== groupId) {
        return res.status(404).send({
            message: 'Chore user is not joined to this group'
        });
    }


    choreDate = new Date(choreDate);
    if (choreDate < Date.now()) {
        return res.status(409).send({
            message: 'Already past the date'
        });
    }

    if (await checkChore(choreCategory, choreDate, choreUserId)) {
        return res.status(409).send({
            message: 'Chores already created'
        })
    }

    try {
        const chore = await Chore.create({
            chore_title: choreTitle,
            chore_category: choreCategory,
            chore_date: choreDate,
            chore_check: choreChecks.BEFORE,
            group_id: groupId,
            chore_user_id: choreUserId
        });
        return res.status(201).json(chore);
    } catch (e) {
        console.error(e)
    }

});

const validEnum = (e, d) => {
    return Object.values(e).includes(d);
};

const validRequest = (error) => {
    return !error.isEmpty();
};

const findByGroupId = async (id) => {
    const group = await Group.findByPk(id);
    return group !== null;
};

const findByUserId = async (id) => {
    return await User.findByPk(id);
};

const checkChore = async (category, date, id) => {
    const chore = await Chore.findOne({
        where: {
            chore_category: category,
            chore_date: date,
            chore_user_id: id
        }
    });
    return chore !== null;
}

module.exports = router;