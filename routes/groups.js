const Group = require('../models/group');
const User = require('../models/user');
const {validationResult, check} = require("express-validator");
const router = require('express').Router();
const Op = require('sequelize').Op;

//그룹 생성
router.post('/:userId', [
    check("groupName", "Group name is too short").trim().isLength({min: 4})
], async (req, res) => {
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
                msg : 'Group name is too short'
            }
      }
      #swagger.responses[404] = {
            description : '유저를 찾을 수 없음',
            schema : {
                msg : 'User not found'
            }
      }
      #swagger.responses[409] = {
            description : '유저가 이미 그룹에 가입함',
            schema : {
                msg : 'User already join in group'
            }
      }
     */
    const err = validationResult(req);
    if (validRequest(err)) {
        return res.status(400).send({
            msg: err.array()[0].msg,
        });
    }

    const userId = req.params.userId * 1;
    const user = await User.findByUserId(userId);
    if (!User.userNotFound(user)) {
        return res.status(404).send({
            msg: '해당하는 유저를 찾을 수 없습니다.'
        });
    }

    if (user.group_id !== null) {
        return res.status(409).send({
            msg: '이미 그룹에 가입한 유저입니다.'
        });
    }

    try {
        const group = await Group.create({
            group_name: req.body.groupName, group_invite_code: await createGroupInviteCode(),
        });
        await User.update({group_id: group.group_id}, {where: {user_id: userId}, returning: true});

        return res.status(201).json(group);
    } catch (err) {
        console.error(err);
    }
});

//그룹 가입
router.post('/join/:userId', [
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
                msg : 'Group invite code is empty'
            }
      }
      #swagger.responses[404] = {
            description : '유저를 찾을 수 없음',
            schema : {
                msg : 'User not found'
            }
      }
      #swagger.responses[409] = {
            description : '유저가 이미 그룹에 가입함',
            schema : {
                msg : 'User already join in group'
            }
      }
     */
    const err = validationResult(req);
    if (validRequest(err)) {
        return res.status(400).send({
            msg: err.array()[0].msg,
        });
    }

    const userId = req.params.userId * 1;
    const user = await User.findByUserId(userId);
    if (!User.userNotFound(user)) {
        return res.status(404).send({
            msg: '해당하는 유저를 찾을 수 없습니다.'
        });
    }

    if (user.group_id !== null) {
        return res.status(409).send({
            msg: '이미 그룹에 가입한 유저입니다.'
        });
    }

    const groupInviteCode = req.body.groupInviteCode;
    const group = await Group.findByInviteCode(groupInviteCode);
    if (!Group.groupNotFound(group)) {
        return res.status(404).send({
            msg: '해당하는 그룹이 없습니다.'
        });
    }

    try {
        await User.update({group_id: group.group_id}, {where: {user_id: userId}, returning: true});

        const user = await User.findByPk(userId, {
                attributes: [['user_name', 'userName'], ['user_nickname', 'userNickname'], ['user_email', 'userEmail']]
            }
        );
        return res.status(200).json(user);

    } catch (e) {
        console.error(e);
    }
});

//그룹 멤버 조회
router.get('/:groupId/:userId', async (req, res, next) => {
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
              msg : '[Group not found] or [User not found]'
          }
    }
      #swagger.responses[409] = {
          description : '유저가 해당하는 그룹에 없음',
          schema : {
              msg : 'User is not joined to this group'
          }
    }
   */

    const userId = req.params.userId * 1;
    const user = await User.findByUserId(userId);
    if (!User.userNotFound(user)) {
        return res.status(404).send({
            msg: '해당하는 유저를 찾을 수 없습니다.'
        });
    }

    const groupId = req.params.groupId * 1;
    const group = await Group.findByGroupId(groupId);
    if (!Group.groupNotFound(group)) {
        return res.status(404).send({
            msg: '해당하는 그룹이 없습니다.'
        });
    }
    if (!User.userNotInGroup(user, groupId)) {
        return res.status(404).send({
            msg: '그룹 안에 해당하는 유저를 찾을 수 없습니다.'
        });
    }

    const users = await User.findAll({
        attributes: ['user_id'],
        where: {
            group_id: groupId, [Op.not]: {user_id: userId}
        }
    });
    return res.status(200).json(users);
});

//그룹 공지 등록
router.put('/:groupId/report', [
    check('groupReport', 'Report is empty').trim().not().isEmpty(),
    check('groupReport', 'Report is too long').trim().isLength({max: 50})
], async (req, res) => {
    const err = validationResult(req);
    if (validRequest(err)) {
        return res.status(400).send({
            msg: err.array()[0].msg,
        });
    }

    const groupId = req.params.groupId * 1;
    let group = await Group.findByGroupId(groupId);
    if (!Group.groupNotFound(group)) {
        return res.status(404).send({
            msg: '해당하는 그룹이 없습니다.'
        });
    }

    const groupReport = req.body.groupReport;
    try {
        await Group.update(
            {
                group_report: groupReport
            }, {
                where: {group_id: groupId}
            }
        );
        group = await Group.findByPk(groupId, {
            attributes: [['group_report', 'groupReport']]
        });
        return res.status(200).json(group);
    } catch (e) {
        console.error(e);
    }
});

const createGroupInviteCode = async () => {
    const chs = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
    let ranCode = '';

    do {
        let code = '';
        for (let i = 0; i < 7; i++) {
            let c = chs[Math.floor(Math.random() * chs.length)];
            code += c;
        }
        ranCode = code;
    } while ((await findByGroupCode(ranCode) !== null));
    return ranCode;
}

const findByGroupCode = async (code) => {
    return await Group.findOne({
        where: {group_invite_code: code}
    });
}

const validRequest = (error) => {
    return !error.isEmpty();
}

module.exports = router;