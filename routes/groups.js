const Groups = require('../models/group');
const Users = require('../models/user');
const {validationResult, check} = require("express-validator");
const router = require('express').Router();
const Op = require('sequelize').Op;

//그룹 생성
router.post('/:user_id', [check("groupName", "Group name is too short").trim().isLength({min: 4})], async (req, res, next) => {
    /*
      #swagger.tags = ['Group']
      #swagger.description = '그룹 생성 POST 요청'
      #swagger.responses[201] = {
            description: '그룹 생성 성공',
            schema: {
                groupId : 1,
                groupName: 'animal',
                groupInviteCode : 'R0QoJJq',
                groupReport : ''
            }
      }
      #swagger.responses[400] = {
            description : '그룹 이름이 3글자 이상이어야 함',
            schema : {
                message : 'Group name is too short'
            }
      }
      #swagger.responses[404] = {
            description : '유저를 찾을 수 없음',
            schema : {
                message : 'User not found'
            }
      }
      #swagger.responses[409] = {
            description : '유저가 이미 그룹에 가입함',
            schema : {
                message : 'User already join in group'
            }
      }
     */
    const err = validationResult(req);
    if (validRequest(err)) {
        return res.status(400).send({
            message: err.array()[0].msg,
        });
    }

    const userId = req.params.user_id * 1;
    const con = await findByUserId(userId);
    if (!con) {
        return res.status(404).send({
            message: 'User not found'
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
            group_name: req.body.groupName, group_invite_code: createGroupInviteCode(),
        });
        await Users.update({group_id: group.group_id}, {where: {user_id: userId}, returning: true});

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
    /*
      #swagger.tags = ['Group']
      #swagger.description = '그룹 가입 POST 요청'
      #swagger.parameters['groupInviteCode'] = {
        in : 'body',
        description : '그룹 초대 코드',
        schema : {
            groupInviteCode : 'R0QoJJq'
        }
      }
      #swagger.responses[200] = {
            description: '그룹 가입 성공',
            schema: {
                userName : 'hehehe',
                userNickname: 'happy people',
                userEmail : 'hehe@naver.com'
            }
      }
      #swagger.responses[400] = {
            description : '그룹 초대 코드가 비었음',
            schema : {
                message : 'Group invite code is empty'
            }
      }
      #swagger.responses[404] = {
            description : '유저를 찾을 수 없음',
            schema : {
                message : 'User not found'
            }
      }
      #swagger.responses[409] = {
            description : '유저가 이미 그룹에 가입함',
            schema : {
                message : 'User already join in group'
            }
      }
     */
    const err = validationResult(req);
    if (validRequest(err)) {
        return res.status(400).send({
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
        await Users.update({group_id: group.group_id}, {where: {user_id: userId}, returning: true});

        const user = await getUser(userId);
        return res.status(200).send({
            "userName": user.user_name, "userNickname": user.user_nickname, "userEmail": user.user_email
        });

    } catch (e) {
        console.error(e);
    }
});

//그룹 멤버 조회
router.get('/:group_id/:user_id', async (req, res, next) => {
  /*
  #swagger.tags = ['Group']
  #swagger.description = '그룹 멤버(본인 제외) 조회 GET 요청'
  #swagger.responses[200] = {
        description: '그룹 멤버 조회 성공',
        schema: [
            {
                user_id : 1
            },
            {
                user_id : 3
            }
        ]


  }
  #swagger.responses[404] = {
        description : '그룹이나 유저를 찾을 수 없음',
        schema : {
            message : '[Group not found] or [User not found]'
        }
  }
    #swagger.responses[409] = {
        description : '유저가 해당하는 그룹에 없음',
        schema : {
            message : 'User is not joined to this group'
        }
  }
 */

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
        attributes: ['user_id'], where: {
            group_id: groupId, [Op.not]: {user_id: userId}
        }
    });
    return res.status(200).json(users);
});

const createGroupInviteCode = () => {
    const chs = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
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