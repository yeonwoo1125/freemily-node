const Quest = require('../models/quest');
const User = require('../models/user');
const Group = require('../models/group');
const {validationResult, check} = require("express-validator");
const Users = require("../models/user");
const router = require('express').Router();
const Op = require('sequelize').Op;

//심부름 생성
router.post('/:group_id/:user_id', [
    check("questTitle", "title is empty").trim().not().isEmpty(),
    check("questContent", "content is empty").trim().not().isEmpty()
], async (req, res) => {
    const err = validationResult(req);
    if (validRequest(err)) {
        console.log(err);
        return res.status(400).send({
            message: err.array()[0].msg,
        });
    }

    const groupId = req.params.group_id * 1;
    if (!await findByGroupId(groupId)) {
        return res.status(404).send({
            message: 'Group not found'
        });
    }

    const userId = req.params.user_id * 1;
    if (!await findByUserId(userId)) {
        return res.status(404).send({
            message: 'User not found'
        });
    }

    const user = await getUser(userId);
    if (user.group_id !== groupId) {
        return res.status(404).send({
            message: 'User is not joined to this group'
        });
    }

    const {questTitle, questContent} = req.body;
    try {
        const quest = await Quest.create({
            quest_title: questTitle,
            quest_content: questContent,
            request_user_id: userId,
            group_id: groupId,
            complete_check: false,
            accept_user_id: -1
        });

        return res.status(201).send({
            'questId': quest.quest_id,
            'questTitle': quest.quest_title,
            'questContent': quest.quest_content
        })
    } catch (e) {
        console.error(e);
    }
});

//심부름 목록 조회
router.get('/:group_id',async (req, res)=>{
    const groupId = req.params.group_id * 1;
    if (!await findByGroupId(groupId)) {
        return res.status(404).send({
            message: 'Group not found'
        });
    }

    try{
        const quests = await Quest.findAll({
            attributes : [
                'quest_id','request_user_id','quest_title',
                'quest_content','complete_check','accept_user_id'
            ],
            where : {group_id : groupId}
        });

        return res.status(201).json(quests);
    }catch (e) {
        console.error(e);
    }
});

const validRequest = (error) => {
    return !error.isEmpty();
}

const findByUserId = async (id) => {
    return await User.findByPk(id) !== null;
}

const findByGroupId = async (id) => {
    return await Group.findByPk(id) !== null;
}

const getUser = async (id) => {
    return await Users.findByPk(id);
}

module.exports = router;