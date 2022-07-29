const Groups = require('../models/group');
const Users = require('../models/user');
const {validationResult, check} = require("express-validator");
const router = require('express').Router();
const Op = require('sequelize').Op;

//그룹 생성
router.post('/:user_id', [
        check("groupName", "Group name is too short").trim().isLength({min: 4})
    ],
    async (req, res, next) => {

        const err = validationResult(req);
        if (validRequest(err)) {
            return res.status(409).send({
                message: err.array()[0].msg,
            });
        }

        const userId = req.params.user_id * 1;
        const con = await findByUserId(userId);
        if (!con) {
            return res.status(404).send({
                message: 'User Not Found'
            });
        }

        const user = await getUser(userId);
        if (user.group_id !== null) {
            return res.status(409).send({
                message: 'User already join in group'
            });
        }

        try {
            const group = await Groups.create({
                group_name: req.body.groupName,
                group_invite_code: createGroupInviteCode(),
            });
            await Users.update(
                {group_id: group.group_id},
                {where: {user_id: userId}, returning: true});

            return res.status(201).json(group);
        } catch (err) {
            console.error(err);
            next(err);
        }
    });

//그룹 가입
router.post('/join/:user_id', [
    check('groupInviteCode', 'Group invite code is empty').trim().not().isEmpty()
], async (req, res) => {

    const err = validationResult(req);
    if (validRequest(err)) {
        return res.status(409).send({
            message: err.array()[0].msg,
        });
    }

    const userId = req.params.user_id * 1;
    if (!await findByUserId(userId)) {
        return res.status(404).send({
            message: 'User Not Found'
        });
    }

    const user = await getUser(userId);

    if (user.group_id !== null) {
        return res.status(409).send({
            message: 'User already join in group'
        });
    }

    const groupInviteCode = req.body.groupInviteCode;
    if (!await findByInviteCode(groupInviteCode)) {
        return res.status(404).send({
            message: 'Group Not Found'
        });
    }

    const group = await getGroup(groupInviteCode);

    try {
        await Users.update(
            {group_id: group.group_id},
            {where: {user_id: userId}, returning: true});

        const user = await getUser(userId);
        return res.status(201).send({
            "userId": user.user_id,
            "userName": user.user_name,
            "userNickname": user.user_nickname,
            "userEmail": user.user_email
        });

    } catch (e) {
        console.error(e);
    }
});

//그룹 멤버 조회
router.get('/:group_id/:user_id', async (req, res, next) => {
    const userId = req.params.user_id * 1;
    if (!await findByUserId(userId)) {
        return res.status(404).send({
            message: 'User Not Found'
        });
    }

    const groupId = req.params.group_id * 1;
    if (!await findByGroupId(groupId)) {
        return res.status(404).send({
            message: 'Group Not Found'
        });
    }
    const user = await getUser(userId);
    if (user.group_id !== groupId) {
        return res.status(409).send({
            message: 'User is not joined to this group'
        });
    }

    const users = await Users.findAll({
        attributes: ['user_id'],
        where: {
            group_id: groupId,
            [Op.not]: {user_id: userId}
        }
    });
    return res.status(200).json(users);
});

const createGroupInviteCode = () => {
    const chs = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
        'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
        'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
        'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
    let ranCode = '';

    do {
        let code = '';
        for (let i = 0; i < 7; i++) {
            let c = chs[Math.floor(Math.random() * chs.length)];
            code += c;
        }
        ranCode = code;
    } while ((findByInviteCode(ranCode)));
    return ranCode;
}

const findByInviteCode = async (code) => {
    const group = await Groups.findOne({
        where: {group_invite_code: code}
    });
    return group !== null;

}

const findByUserId = async (id) => {
    const user = await Users.findByPk(id);
    return user !== null;
}

const findByGroupId = async (id) => {
    const group = await Groups.findByPk(id);
    return group !== null;
}

const getUser = async (id) => {
    return await Users.findByPk(id);
}

const getGroup = async (code) => {
    return await Groups.findOne({
        where: {group_invite_code: code}
    });
}

const validRequest = (error) => {
    return !error.isEmpty();
}

module.exports = router;