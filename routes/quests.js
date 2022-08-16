const Quest = require('../models/quest');
const User = require('../models/user');
const Group = require('../models/group');
const {validationResult, check} = require("express-validator");
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
            message: '해당하는 그룹을 찾을 수 없습니다.'
        });
    }

    const userId = req.params.user_id * 1;
    const user = await findByUserId(userId);
    if (user === null) {
        return res.status(404).send({
            message: '해당하는 유저를 찾을 수 없습니다.'
        });
    }
    if (user.group_id !== groupId) {
        return res.status(404).send({
            message: '유저가 해당하는 그룹에 가입하지 않았습니다.'
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
            message: '해당하는 그룹을 찾을 수 없습니다.'
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
            message: '해당하는 그룹을 찾을 수 없습니다.'
        });
    }

    const questId = req.params.quest_id * 1;
    let quest = await findByQuestId(questId);
    if (quest === null) {
        return res.status(404).send({
            message: '해당하는 심부름을 찾을 수 없습니다.'
        });
    }

    if (quest.group_id !== groupId) {
        return res.status(404).send({
            message: '그룹에 해당하는 심부름이 없습니다.'
        })
    }

    const userId = req.query.requesterId * 1;
    const user = await findByUserId(userId);
    if (user === null) {
        return res.status(404).send({
            message: '해당하는 유저를 찾을 수 없습니다.'
        });
    }

    if (user.group_id !== groupId) {
        return res.status(404).send({
            message: '유저가 해당하는 그룹에 존재하지 않습니다.'
        })
    }

    if (quest.request_user_id !== userId) {
        return res.status(409).send({
            message: '심부름을 생성한 유저만 수정할 수 있습니다.'
        })
    }

    if (quest.accept_user_id !== -1) {
        return res.status(405).send({
            message: '이미 수락자가 있는 심부름입니다.'
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
            message: '해당하는 그룹을 찾을 수 없습니다.'
        });
    }

    const questId = req.params.quest_id * 1;
    const quest = await findByQuestId(questId);
    if (quest === null) {
        return res.status(404).send({
            message: '해당하는 심부름을 찾을 수 없습니다.'
        });
    }

    if (quest.group_id !== groupId) {
        return res.status(404).send({
            message: '그룹에 해당하는 심부름이 없습니다.'
        })
    }

    const userId = req.query.userId * 1;
    const user = await findByUserId(userId);
    if (user === null) {
        return res.status(404).send({
            message: '해당하는 유저를 찾을 수 없습니다.'
        });
    }

    if (quest.request_user_id !== userId) {
        return res.status(409).send({
            message: '심부름을 생성한 유저만 삭제할 수 있습니다.'
        })
    }

    if (quest.accept_user_id !== -1) {
        return res.status(405).send({
            message: '이미 수락자가 있는 심부름입니다.'
        })
    }

    await Quest.destroy({
        where: {quest_id: questId}
    });

    return res.status(200).send({
        message: '심부름이 삭제되었습니다.'
    })
});

//심부름 상세 조회
router.get('/:group_id/details/:quest_id', async (req, res) => {
    const groupId = req.params.group_id * 1;
    const group = await findByGroupId(groupId);
    if (group === null) {
        return res.status(404).send({
            message: '해당하는 그룹을 찾을 수 없습니다.'
        });
    }

    const questId = req.params.quest_id;
    const quest = await findByQuestId(questId);
    if (quest === null) {
        return res.status(404).send({
            message: '해당하는 심부름을 찾을 수 없습니다.'
        });
    }

    if (quest.group_id !== groupId) {
        return res.status(404).send({
            message: '그룹에 해당하는 심부름이 없습니다.'
        });
    }

    return res.status(200).json({
        requestUserId: quest.request_user_id,
        questTitle: quest.quest_title,
        questContent: quest.quest_content,
        questCreatedDate: quest.createdAt,
        completeCheck: quest.complete_check,
        acceptUserId: quest.accept_user_id
    });
});

//심부름 수락 및 수락 취소
router.put('/:group_id/:quest_id/acceptor/:acceptor_id', async (req, res) => {
    const groupId = req.params.group_id * 1;
    const group = await findByGroupId(groupId);
    if (group === null) {
        return res.status(404).send({
            message: '해당하는 그룹을 찾을 수 없습니다.'
        });
    }

    const questId = req.params.quest_id * 1;
    const quest = await findByQuestId(questId);
    if (quest === null) {
        return res.status(404).send({
            message: '해당하는 심부름을 찾을 수 없습니다.'
        });
    }

    if (quest.group_id !== groupId) {
        return res.status(404).send({
            message: '그룹에 해당하는 심부름이 없습니다.'
        });
    }

    if (quest.complete_check) {
        return res.status(409).send({
            message: '이미 해결된 심부름입니다.'
        });
    }

    const acceptorId = req.params.acceptor_id * 1;
    const acceptor = await findByUserId(acceptorId);
    if (acceptor === null) {
        return res.status(404).send({
            message: '심부름 수락자를 찾을 수 없습니다.'
        });
    }

    if (quest.request_user_id === acceptorId) {
        return res.status(409).send({
            message: '퀘스트 생성자는 수락 또는 취소가 불가능합니다.'
        });
    }

    if (acceptor.group_id !== groupId) {
        return res.status(404).send({
            message: '그룹에 해당하는 수락자를 찾을 수 없습니다.'
        })
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
            message: '퀘스트가 수락되었습니다.'
        });
    }
    if (quest.accept_user_id !== acceptorId) {
        return res.status(409).send({
            message: '퀘스트 취소는 수락자만 가능합니다.'
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
        message: '퀘스트가 취소되었습니다.'
    });
});

//심부름 성공 처리
router.put('/:group_id/:quest_id/complete/:requester_id', async (req, res) => {
    const groupId = req.params.group_id * 1;
    const group = await findByGroupId(groupId);
    if (group === null) {
        return res.status(404).send({
            message: '해당하는 그룹을 찾을 수 없습니다.'
        });
    }

    const questId = req.params.quest_id * 1;
    const quest = await findByQuestId(questId);
    if (quest === null) {
        return res.status(404).send({
            message: '해당하는 심부름을 찾을 수 없습니다.'
        });
    }

    if (quest.group_id !== groupId) {
        return res.status(404).send({
            message: '그룹에 해당하는 심부름을 찾을 수 없습니다.'
        });
    }

    if (quest.accept_user_id === -1) {
        return res.status(409).send({
            message: '심부름의 수락자가 없습니다.'
        });
    }

    if (quest.complete_check) {
        return res.status(409).send({
            message: '이미 완료한 심부름입니다.'
        });
    }

    const requesterId = req.params.requester_id * 1;
    const requester = await findByUserId(requesterId);
    if (requester === null) {
        return res.status(404).send({
            message: '그룹에 해당하는 요청자를 찾을 수 없습니다.'
        });
    }

    if (quest.request_user_id !== requesterId) {
        return res.status(409).send({
            message: '심부름 완료 요청은 생성자만 가능합니다.'
        });
    }

    try {
        await Quest.update(
            {
                quest_complete_check: true
            },
            {
                where: {quest_id: questId}
            }
        );
    } catch (e) {
        console.error(e);
    }

    return res.status(200).send({
        message: '심부름이 완료되었습니다.'
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