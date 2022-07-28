const Groups = require('../models/group');
const Users = require('../models/user');
const {validationResult, check} = require("express-validator");
const router = require('express').Router();

//그룹 생성
router.post('/:user_id', [
        check("groupName", "Group name is too short").trim().isLength({min: 4})
    ],
    async (req, res, next) => {

        const err = validationResult(req);
        if (validRequest(err)) {
            console.log(err);
            return res.status(409).send({
                message: err.array()[0].msg,
            });
        }

        const userId = req.params.user_id * 1;
        const con = await findByUserId(userId);
        if (!con) {
            return res.status(404).send({
                message: '해당하는 유저가 존재하지 않습니다.'
            });
        }

        const user = await getUser(userId);
        if(user.group_id !== null){
            return res.status(409).send({
                message: '이미 그룹에 가입된 유저입니다.'
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

const findByInviteCode = (code) => {
    Groups.findByPk(code).then(data => {
        return data !== null;
    });
    return false;
}

const findByUserId = async (id) => {
    const user = await Users.findByPk(id);
    return user !== null;
}

const getUser = async (id) =>{
    return await Users.findByPk(id);
}

const validRequest = (error) => {
    return !error.isEmpty();
}

module.exports = router;