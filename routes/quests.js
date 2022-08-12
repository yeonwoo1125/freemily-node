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
    const group = await findByGroupId(groupId);
    if (group === null) {
        return res.status(404).send({
            message: 'Group not found'
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
router.get('/:group_id', async (req, res) => {
    const groupId = req.params.group_id * 1;
    const group = await findByGroupId(groupId);
    if (group === null) {
        return res.status(404).send({
            message: 'Group not found'
        });
    }

    try {
        const quests = await Quest.findAll({
            attributes: [
                'quest_id', 'request_user_id', 'quest_title',
                'quest_content', 'complete_check', 'accept_user_id'
            ],
            where: {group_id: groupId}
        });

        return res.status(201).json(quests);
    } catch (e) {
        console.error(e);
    }
});

//심부름 수정
router.put('/:group_id/:quest_id', [
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
    const group = await findByGroupId(groupId);
    if (group === null) {
        return res.status(404).send({
            message: 'Group not found'
        });
    }

    const questId = req.params.quest_id * 1;
    let quest = await findByQuestId(questId);
    if (quest === null) {
        return res.status(404).send({
            message: 'Quest not found'
        });
    }

    if (quest.group_id !== groupId) {
        return res.status(404).send({
            message: 'Not quest for a group'
        })
    }

    const userId = req.query.requesterId * 1;
    const user = await findByUserId(userId);
    if (user === null) {
        return res.status(404).send({
            message: 'User not found'
        });
    }

    if (user.group_id !== groupId) {
        return res.status(404).send({
            message: 'User is not joined to this group'
        })
    }

    if (quest.request_user_id !== userId) {
        return res.status(409).send({
            message: 'Only users you create can modify'
        })
    }

    if (quest.accept_user_id !== -1) {
        return res.status(405).send({
            message: 'Already accepted quest'
        })
    }

    const {questTitle, questContent} = req.body;
    await Quest.update(
        {
            quest_title: questTitle,
            quest_content: questContent
        },
        {
            where: {quest_id: questId}
        }
    )

    quest = await findByQuestId(questId);
    return res.status(200).json({
        requestUserId: quest.request_user_id,
        questTitle: quest.quest_title,
        questContent: quest.quest_content,
        questModifiedDate: quest.updatedAt,
        completeCheck: quest.complete_check,
        acceptUserId: quest.accept_user_id
    });
});

//심부름 삭제
router.delete('/:group_id/:quest_id', async (req, res) => {
    const groupId = req.params.group_id * 1;
    const group = await findByGroupId(groupId);
    if (group === null) {
        return res.status(404).send({
            message: 'Group not found'
        });
    }

    const questId = req.params.quest_id * 1;
    const quest = await findByQuestId(questId);
    if (quest === null) {
        return res.status(404).send({
            message: 'Quest not found'
        });
    }

    if (quest.group_id !== groupId) {
        return res.status(404).send({
            message: 'Not quest for a group'
        })
    }

    const userId = req.query.userId * 1;
    const user = await findByUserId(userId);
    if (user === null) {
        return res.status(404).send({
            message: 'User not found'
        });
    }

    if (quest.request_user_id !== userId) {
        return res.status(409).send({
            message: 'Only the person who created it can delete it'
        })
    }

    if (quest.accept_user_id !== -1) {
        return res.status(405).send({
            message: 'Already accepted quest'
        })
    }

    await Quest.destroy({
        where: {quest_id: questId}
    });

    return res.status(200).send({
        message: 'Quest deleted'
    })
});

const validRequest = (error) => {
    return !error.isEmpty();
}

const findByUserId = async (id) => {
    return await User.findByPk(id);
}

const findByGroupId = async (id) => {
    return await Group.findByPk(id);
}

const findByQuestId = async (id) => {
    return await Quest.findByPk(id);
}

module.exports = router;