const Quest = require('../models/quest');
const User = require('../models/user');
const Group = require('../models/group');
const {validationResult, check} = require("express-validator");
const router = require('express').Router();

//심부름 생성
router.post('/:groupId/:userId', [
    check("questTitle", "title is empty").trim().not().isEmpty(),
    check("questContent", "content is empty").trim().not().isEmpty()
], async (req, res) => {
    const err = validationResult(req);
    if (validRequest(err)) {
        console.log(err);
        return res.status(400).send({
            msg: err.array()[0].msg,
        });
    }

    const groupId = req.params.groupId * 1;
    const group = await Group.findByGroupId(groupId);
    if (!Group.groupNotFound(group)) {
        return res.status(404).send({
            msg: '해당하는 그룹이 없습니다.'
        });
    }

    const userId = req.params.userId * 1;
    const user = await User.findByUserId(userId);
    if (!User.userNotFound(user)) {
        return res.status(404).send({
            msg: '해당하는 유저를 찾을 수 없습니다.'
        });
    }

    if (!User.userNotInGroup(user, groupId)) {
        return res.status(404).send({
            msg: '그룹 안에 해당하는 유저를 찾을 수 없습니다.'
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
router.get('/:groupId', async (req, res) => {
    const groupId = req.params.groupId * 1;
    const group = await Group.findByGroupId(groupId);
    if (!Group.groupNotFound(group)) {
        return res.status(404).send({
            msg: '해당하는 그룹이 없습니다.'
        });
    }

    try {
        const quests = await Quest.findAll({
            attributes: [
                ['quest_id', 'questId'], ['request_user_id', 'requestUserId'], ['quest_title', 'questTitle'],
                ['quest_content', 'questContent'], ['complete_check', 'completeCheck'], ['accept_user_id', 'acceptUserId']
            ],
            where: {group_id: groupId}
        });

        return res.status(201).json(quests);
    } catch (e) {
        console.error(e);
    }
});

//심부름 수정
router.put('/:groupId/:questId', [
    check("questTitle", "title is empty").trim().not().isEmpty(),
    check("questContent", "content is empty").trim().not().isEmpty()
], async (req, res) => {
    const err = validationResult(req);
    if (validRequest(err)) {
        return res.status(400).send({
            msg: err.array()[0].msg,
        });
    }

    const groupId = req.params.groupId * 1;
    const group = await Group.findByGroupId(groupId);
    if (!Group.groupNotFound(group)) {
        return res.status(404).send({
            msg: '해당하는 그룹이 없습니다.'
        });
    }

    const questId = req.params.questId * 1;
    let quest = await Quest.findByQuestId(questId);
    if (!Quest.questNotFound(quest)) {
        return res.status(404).send({
            msg: '해당하는 심부름을 찾을 수 없습니다.'
        });
    }

    if (!Quest.questNotInGroup(quest, groupId)) {
        return res.status(404).send({
            msg: '그룹에 해당하는 심부름을 찾을 수 없습니다.'
        });
    }

    const userId = req.query.requesterId * 1;
    const user = await User.findByUserId(userId);
    if (!User.userNotFound(user)) {
        return res.status(404).send({
            msg: '해당하는 유저를 찾을 수 없습니다.'
        });
    }

    if (!User.userNotInGroup(user, groupId)) {
        return res.status(404).send({
            msg: '그룹 안에 해당하는 유저를 찾을 수 없습니다.'
        });
    }

    if (quest.request_user_id !== userId) {
        return res.status(409).send({
            msg: '심부름을 생성한 유저만 수정할 수 있습니다.'
        })
    }

    if (quest.accept_user_id !== -1) {
        return res.status(405).send({
            msg: '이미 수락자가 있는 심부름입니다.'
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

    quest = await Quest.findByPk(questId, {
        attributes: [['request_user_id', 'requestUserId'], ['quest_title', 'questTitle'], ['quest_content', 'questContent'], ['updatedAt', 'questModifiedDate'],
            ['complete_check', 'completeCheck'], ['accept_user_id', 'acceptUserId']]
    });
    return res.status(200).json(quest);
});

//심부름 삭제
router.delete('/:groupId/:questId', async (req, res) => {
    const groupId = req.params.groupId * 1;
    const group = await Group.findByGroupId(groupId);
    if (!Group.groupNotFound(group)) {
        return res.status(404).send({
            msg: '해당하는 그룹이 없습니다.'
        });
    }

    const questId = req.params.questId * 1;
    const quest = await Quest.findByQuestId(questId);
    if (!Quest.questNotFound(quest)) {
        return res.status(404).send({
            msg: '해당하는 심부름을 찾을 수 없습니다.'
        });
    }

    if (!Quest.questNotInGroup(quest, groupId)) {
        return res.status(404).send({
            msg: '그룹에 해당하는 심부름을 찾을 수 없습니다.'
        });
    }

    const userId = req.query.userId * 1;
    const user = await User.findByUserId(userId);
    if (!User.userNotFound(user)) {
        return res.status(404).send({
            msg: '해당하는 유저를 찾을 수 없습니다.'
        });
    }

    if (quest.request_user_id !== userId) {
        return res.status(409).send({
            msg: '심부름을 생성한 유저만 삭제할 수 있습니다.'
        })
    }

    if (quest.accept_user_id !== -1) {
        return res.status(405).send({
            msg: '이미 수락자가 있는 심부름입니다.'
        })
    }

    await Quest.destroy({
        where: {quest_id: questId}
    });

    return res.status(200).send({
        msg: '심부름이 삭제되었습니다.'
    });
});

//심부름 상세 조회
router.get('/:groupId/details/:questId', async (req, res) => {
    const groupId = req.params.groupId * 1;
    const group = await Group.findByGroupId(groupId);
    if (!Group.groupNotFound(group)) {
        return res.status(404).send({
            msg: '해당하는 그룹이 없습니다.'
        });
    }

    const questId = req.params.questId;
    let quest = await Quest.findByQuestId(questId);
    if (!Quest.questNotFound(quest)) {
        return res.status(404).send({
            msg: '해당하는 심부름을 찾을 수 없습니다.'
        });
    }

    if (!Quest.questNotInGroup(quest, groupId)) {
        return res.status(404).send({
            msg: '그룹에 해당하는 심부름을 찾을 수 없습니다.'
        });
    }

    quest = await Quest.findByPk(questId, {
        attributes: [['request_user_id', 'requestUserId'], ['quest_title', 'questTitle'], ['quest_content', 'questContent'], ['createdAt', 'questCreatedDate'],
            ['complete_check', 'completeCheck'], ['accept_user_id', 'acceptUserId']]
    });

    return res.status(200).json(quest);
});

//심부름 수락 및 수락 취소
router.put('/:groupId/:questId/acceptor/:acceptorId', async (req, res) => {
    const groupId = req.params.groupId * 1;
    const group = await Group.findByGroupId(groupId);
    if (!Group.groupNotFound(group)) {
        return res.status(404).send({
            msg: '해당하는 그룹이 없습니다.'
        });
    }

    const questId = req.params.questId * 1;
    const quest = await Quest.findByQuestId(questId);
    if (!Quest.questNotFound(quest)) {
        return res.status(404).send({
            msg: '해당하는 심부름을 찾을 수 없습니다.'
        });
    }

    if (!Quest.questNotInGroup(quest, groupId)) {
        return res.status(404).send({
            msg: '그룹에 해당하는 심부름을 찾을 수 없습니다.'
        });
    }

    if (quest.complete_check) {
        return res.status(409).send({
            msg: '이미 해결된 심부름입니다.'
        });
    }

    const acceptorId = req.params.acceptorId * 1;
    const acceptor = await User.findByUserId(acceptorId);
    if (!User.userNotFound(acceptor)) {
        return res.status(404).send({
            msg: '해당하는 유저를 찾을 수 없습니다.'
        });
    }

    if (quest.request_user_id === acceptorId) {
        return res.status(409).send({
            msg: '퀘스트 생성자는 수락 또는 취소가 불가능합니다.'
        });
    }

    if (!User.userNotInGroup(acceptor, groupId)) {
        return res.status(404).send({
            msg: '그룹 안에 해당하는 유저를 찾을 수 없습니다.'
        });
    }

    if (quest.accept_user_id === -1) {
        try {
            await Quest.update(
                {
                    accept_user_id: acceptorId
                },
                {
                    where: {quest_id: questId}
                }
            );
        } catch (e) {
            console.error(e);
        }
        return res.status(200).send({
            msg: '퀘스트가 수락되었습니다.'
        });
    }
    if (quest.accept_user_id !== acceptorId) {
        return res.status(409).send({
            msg: '퀘스트 취소는 수락자만 가능합니다.'
        });
    }

    await Quest.update(
        {
            accept_user_id: -1
        },
        {
            where: {quest_id: questId}
        }
    );

    return res.status(200).send({
        msg: '퀘스트가 취소되었습니다.'
    });
});

//심부름 성공 처리
router.put('/:groupId/:questId/complete/:requesterId', async (req, res) => {
    const groupId = req.params.groupId * 1;
    const group = await Group.findByGroupId(groupId);
    if (!Group.groupNotFound(group)) {
        return res.status(404).send({
            msg: '해당하는 그룹이 없습니다.'
        });
    }

    const questId = req.params.questId * 1;
    const quest = await Quest.findByQuestId(questId);
    if (!Quest.questNotFound(quest)) {
        return res.status(404).send({
            msg: '해당하는 심부름을 찾을 수 없습니다.'
        });
    }

    if (!Quest.questNotInGroup(quest, groupId)) {
        return res.status(404).send({
            msg: '그룹에 해당하는 심부름을 찾을 수 없습니다.'
        });
    }

    if (quest.accept_user_id === -1) {
        return res.status(409).send({
            msg: '심부름의 수락자가 없습니다.'
        });
    }

    if (quest.complete_check) {
        return res.status(409).send({
            msg: '이미 완료한 심부름입니다.'
        });
    }

    const requesterId = req.params.requesterId * 1;
    const requester = await User.findByUserId(requesterId);
    if (!User.userNotFound(requester)) {
        return res.status(404).send({
            msg: '해당하는 유저를 찾을 수 없습니다.'
        });
    }

    if (!User.userNotInGroup(requester, groupId)) {
        return res.status(404).send({
            msg: '그룹에 해당하는 유저를 찾을 수 없습니다.'
        });
    }

    if (quest.request_user_id !== requesterId) {
        return res.status(409).send({
            msg: '심부름 완료 요청은 생성자만 가능합니다.'
        });
    }

    try {
        await Quest.update(
            {
                complete_check: true
            },
            {
                where: {quest_id: questId}
            }
        );
    } catch (e) {
        console.error(e);
    }

    return res.status(200).send({
        msg: '심부름이 완료되었습니다.'
    })
});

const validRequest = (error) => {
    return !error.isEmpty();
}

module.exports = router;