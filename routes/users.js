const User = require('../models/user');
const {validationResult, check} = require("express-validator");
const router = require('express').Router();
const bcrypt = require('bcrypt');
const moment = require("moment");
const Chore = require("../models/chore");
const {sequelize} = require("../models");
const {Op} = require("sequelize");
const Quest = require("../models/quest");

//유저 생성
router.post('/',
    [
        check('userEmail', "Email format is not valid").trim().isEmail(),
        check('userEmail', 'Email is empty').trim().not().isEmpty(),
        check('userPassword', 'Password is too short').trim().isLength({min: 8}),
        check('userName', 'Name is too short').trim().isLength({min: 4})
    ],
    async (req, res) => {
        /*
          #swagger.tags = ['User']
          #swagger.description = '유저 생성 POST 요청'
          #swagger.parameters['obj'] = {
                    in: 'body',
                    description: '유저 생성 정보',
                    schema: {
                        userName: 'Hello',
                        userNickname : 'Hi',
                        userEmail: 'hehe@naver.com',
                        userPassword : 'mypassword11'
                    }
          }
          #swagger.responses[201] = {
                description: '그룹 생성',
                schema: {
                    userId : 1,
                    userName : 'Hello',
                    userNickname : 'Hi',
                    userEmail : 'hehe@naver.com'
                }
          }
          #swagger.responses[400] = {
                description : '잘못된 request 형식',
                schema : {
                    msg : [
                        'Email format is not valid',
                        'Email is empty',
                        'Password is too short',
                        'Name is too short'
                    ]
                }
          }
            #swagger.responses[409] = {
                description : '이미 가입한 이메일',
                schema : {
                    msg : 'Email is already use'
                }
          }
         */
        const err = validationResult(req);
        if (validRequest(err)) {
            console.log(err);
            return res.status(400).send({
                msg: err.array()[0].msg,
            });
        }

        const userByEmail = await User.findByEmail(req.body.userEmail);
        if (!User.alreadyJoinEmail(userByEmail)) {
            return res.status(409).send({
                msg: '이미 가입된 이메일입니다.'
            });
        }

        const salt = 12;
        const password = req.body.userPassword;
        const hashPw = await bcrypt.hash(password, salt);

        try {
            let user = await User.create({
                user_name: req.body.userName,
                user_nickname: req.body.userNickname,
                user_email: req.body.userEmail,
                user_password: hashPw
            });

            user = await User.findByPk(user.user_id, {
                attributes: [['user_id', 'userId'], ['user_name', 'userName'], ['user_nickname', 'userNickname'], ['user_email', 'userEmail']]
            });

            return res.status(201).json(user);

        } catch (e) {
            console.error(e);
        }
    });

//유저 로그인
router.post('/login', [
    check('userEmail', 'Email format is not valid').trim().isEmail(),
    check('userPassword', 'Password is empty').trim().not().isEmpty()
], async (req, res) => {
    /*
          #swagger.tags = ['User']
          #swagger.description = '유저 로그인 POST 요청'
          #swagger.parameters['obj'] = {
                    in: 'body',
                    description: '유저 로그인 정보',
                    schema: {
                        userEmail: 'hehe@naver.com',
                        userPassword : 'mypassword11'
                    }
          }
          #swagger.responses[200] = {
                description: '그룹 생성',
                schema: {
                    userId : 1,
                    userName : 'Hello',
                    userNickname : 'Hi',
                    userEmail : 'hehe@naver.com'
                }
          }
          #swagger.responses[400] = {
                description : '잘못된 request 형식',
                schema : {
                    msg : '[Email format is not valid] or [Password is empty]'
                }
          }
          #swagger.responses[403] = {
                description : '이메일과 비밀번호가 일치하지 않음',
                schema : {
                    msg : 'Email and password mismatch'
                }
          }
          #swagger.responses[404] = {
                description : '이메일을 찾을 수 없거나 그룹에 가입하지 않음',
                schema : {
                    msg : '[Email not found] or [User not join group]'
                }
          }

     */
    const err = validationResult(req);
    if (validRequest(err)) {
        return res.status(400).send({
            msg: err.array()[0].msg,
        });
    }
    const {userEmail, userPassword} = req.body;

    const user = await User.findByEmail(userEmail);
    if (!User.userNotFoundByEmail(user)) {
        return res.status(404).send({
            msg: '이메일에 해당하는 유저를 찾을 수 없습니다.'
        });
    }

    if (user.group_id === null) {
        return res.status(404).send({
            msg: '유저가 그룹에 가입하지 않았습니다.'
        });
    }

    bcrypt.compare(userPassword, user.user_password, (err, same) => {
        if (same) {
            return res.status(200).send({
                "userId": user.user_id,
                "userName": user.user_name,
                "userNickname": user.user_nickname,
                "userEmail": user.group_id
            });
        } else {
            return res.status(403).send({
                msg: '이메일과 비밀번호가 일치하지 않습니다.'
            })
        }
    });
})

//유저 탈퇴
router.delete('/:userId', [
    check('userPassword', 'Password is empty').trim().not().isEmpty()
], async (req, res) => {

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

    const password = req.body.userPassword;
    const same = await bcrypt.compare(password, user.user_password);
    if (!same) {
        return res.status(401).send({
            msg: '비밀번호가 일치하지 않습니다.'
        });
    }

    try {
        await User.destroy({
            where: {user_id: userId}
        });
        return res.status(200).send({
            msg: '유저가 삭제되었습니다.'

        });
    } catch (e) {
        console.error(e);
    }
});

//유저 정보 수정
router.put('/:userId', [
    check('userName', 'Name is empty').trim().not().isEmpty()
], async (req, res) => {

    const err = validationResult(req);
    if (validRequest(err)) {
        return res.status(400).send({
            msg: err.array()[0].msg,
        });
    }

    const userId = req.params.userId * 1;
    let user = await User.findByUserId(userId);
    if (!User.userNotFound(user)) {
        return res.status(404).send({
            msg: '해당하는 유저를 찾을 수 없습니다.'
        });
    }

    const {name, nickname} = req.body;

    try {
        await User.update(
            {
                user_name: name,
                user_nickname: nickname
            },
            {
                where: {user_id: userId}
            }
        );

        user = await User.findByPk(userId, {
            attributes: [['user_name', 'userName'], ['user_nickname', 'userNickname']]
        });
        return res.status(200).json(user);
    } catch (e) {
        console.error(e);
    }
});

//유저 비밀번호 변경
router.put('/:userId/password', [
    check('userPassword', 'Password is empty').trim().not().isEmpty(),
    check('userNewPassword', 'New password is empty').trim().not().isEmpty(),
    check('userNewPasswordCheck', 'New password check is empty').trim().not().isEmpty(),
    check('userNewPassword', 'New password is too short').trim().isLength({min: 8})
], async (req, res) => {
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
    const {userPassword, userNewPassword, userNewPasswordCheck} = req.body;
    if (userPassword === userNewPassword) {
        return res.status(409).send({
            msg: '비밀번호가 변경되지 않았습니다.'
        });
    }

    const same = await bcrypt.compare(userPassword, user.user_password);
    if (!same) {
        return res.status(401).send({
            msg: '비밀번호가 일치하지 않습니다.'
        });
    }

    if (userNewPassword !== userNewPasswordCheck) {
        return res.status(409).send({
            msg: '새로운 비밀번호가 일치하지 않습니다.'
        });
    }
    const salt = 12;
    const hashPw = await bcrypt.hash(userNewPassword, salt);

    try {
        await User.update(
            {
                user_password: hashPw
            },
            {
                where: {user_id: userId}
            }
        );
    } catch (e) {
        console.error(e);
    }

    return res.status(200).send({
        msg: '비밀번호가 변경되었습니다.'
    });
});

//유저 상세 조회
router.get('/details/:userId', async (req, res) => {
    const userId = req.params.userId * 1;
    const user = await User.findByUserId(userId);
    if (!User.userNotFound(user)) {
        return res.status(404).send({
            msg: '해당하는 유저를 찾을 수 없습니다.'
        });
    }

    const date = new Date(req.query.date);
    if (!validDateFormat(date)) {
        return res.status(400).send({
            msg: '날짜 형식이 올바르지 않습니다.'
        });
    }

    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    const king = {};
    let choreMap = new Map();
    let choreKing = [];
    try {
        const list = await Chore.findAll({
            attributes: [['chore_category', 'category'],
                [sequelize.fn('count', '*'), 'count'], ['chore_user_id', 'userId']],
            raw: true,
            group: ['chore_category', 'chore_user_id'],
            where: {
                chore_check: 'SUCCESS',
                [Op.and]: [
                    sequelize.where(sequelize.fn('year', sequelize.col('chore_date')), '=', year),
                    sequelize.where(sequelize.fn('month', sequelize.col('chore_date')), '=', month)
                ]
            },
            order: [
                [sequelize.fn('count', sequelize.col('*')), 'desc'],
                [sequelize.literal('chore_category'), 'asc']
            ]
        });

        for (let i of list) {
            if (!choreMap.has(i.category) && i.userId === userId) {
                choreMap.set(i.category, i);
            }
        }
        if (choreMap.size !== 0) {
            for (let i of choreMap.values()) {
                choreKing = choreKing.concat(i);
            }
        }

        king.choreKing = choreKing;

        const questKing = await Quest.findOne({
            attributes: [[sequelize.fn('count', '*'), 'count'], ['accept_user_id', 'userId']],
            group: ['accept_user_id'],
            raw: true,
            where: {
                complete_check: true,
                [Op.and]: [
                    sequelize.where(sequelize.fn('year', sequelize.col('createdAt')), '=', year),
                    sequelize.where(sequelize.fn('month', sequelize.col('createdAt')), '=', month)
                ]
            }
        });

        if (questKing.userId === userId) {
            king.questKing = questKing;
        } else {
            king.questKing = [];
        }
    } catch (e) {
        console.error(e);
    }

    const resUser = {
        userName: user.user_name,
        userNickname: user.user_nickname,
        userEmail: user.user_email,
        king: king
    };

    return res.status(200).json(resUser);
});


const validRequest = (error) => {
    return !error.isEmpty();
}

const validDateFormat = (date) => {
    return moment(date, 'YYYY-MM').isValid();
}

module.exports = router;