const User = require('../models/user');
const {validationResult, check} = require("express-validator");
const router = require('express').Router();
const bcrypt = require('bcrypt');

//유저 생성
router.post('/',
    [
        check('userEmail', "Email format is not valid").trim().isEmail(),
        check('userEmail', 'Email is empty').trim().not().isEmpty(),
        check('userPassword', 'Password is too short').trim().isLength({min: 8}),
        check('userName', 'Name is too short').trim().isLength({min: 4})
    ],
    async (req, res, next) => {
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
                    message : [
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
                    message : 'Email is already use'
                }
          }
         */
        const err = validationResult(req);
        if (validRequest(err)) {
            console.log(err);
            return res.status(400).send({
                message: err.array()[0].msg,
            });
        }

        if (await findByEmail(req.body.userEmail)) {
            return res.status(409).send({
                message: '이미 가입한 이메일입니다.'
            });
        }

        const salt = 12;
        const password = req.body.userPassword;
        const hashPw = await bcrypt.hash(password, salt);

        try {
            const user = await User.create({
                user_name: req.body.userName,
                user_nickname: req.body.userNickname,
                user_email: req.body.userEmail,
                user_password: hashPw
            });

            return res.status(201).send({
                "userId": user.user_id,
                "userName": user.user_name,
                "userNickname": user.user_nickname,
                "userEmail": user.user_email
            });

        } catch (e) {
            console.error(e);
            next(e);
        }
    });

//유저 로그인
router.post('/login', [
    check('userEmail', 'Email format is not valid').trim().isEmail(),
    check('userPassword', 'Password is empty').trim().not().isEmpty()
], async (req, res, next) => {
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
                    message : '[Email format is not valid] or [Password is empty]'
                }
          }
          #swagger.responses[403] = {
                description : '이메일과 비밀번호가 일치하지 않음',
                schema : {
                    message : 'Email and password mismatch'
                }
          }
          #swagger.responses[404] = {
                description : '이메일을 찾을 수 없거나 그룹에 가입하지 않음',
                schema : {
                    message : '[Email not found] or [User not join group]'
                }
          }

     */
    const err = validationResult(req);
    if (validRequest(err)) {
        return res.status(400).send({
            message: err.array()[0].msg,
        });
    }

    const userEmail = req.body.userEmail;
    const userPassword = req.body.userPassword;

    if (!await findByEmail(userEmail)) {
        return res.status(404).send({
            message: '해당하는 이메일을 찾을 수 없습니다.'
        });
    }

    const user = await findByUserEmail(userEmail);
    if (user.group_id === null) {
        return res.status(404).send({
            message: '유저가 해당하는 그룹에 존재하지 않습니다.'
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
                message: '이메일과 비밀번호가 일치하지 않습니다.'
            })
        }
    });
})

//유저 탈퇴
router.delete('/:user_id', [
    check('userPassword', 'Password is empty').trim().not().isEmpty()
], async (req, res) => {

    const err = validationResult(req);
    if (validRequest(err)) {
        return res.status(400).send({
            message: err.array()[0].msg,
        });
    }

    const userId = req.params.user_id;
    const user = await findByUserId(userId);
    if (user === null) {
        return res.status(404).send({
            message: '해당하는 유저를 찾을 수 없습니다.'
        });
    }

    const password = req.body.userPassword;
    bcrypt.compare(password, user.user_password, (err, same) => {
        if (!same) {
            return res.status(401).send({
                message: '비밀번호가 틀렸습니다.'
            });
        }
    });

    try {
        await User.destroy({
            where: {user_id: userId}
        });
        return res.status(200).send({
            message: '유저가 삭제되었습니다.'

        });
    } catch (e) {
        console.error(e);
    }
});

//유저 정보 수정
router.put('/:user_id', [
    check('userName', 'Name is empty').trim().not().isEmpty()
], async (req, res) => {

    const err = validationResult(req);
    if (validRequest(err)) {
        return res.status(400).send({
            message: err.array()[0].msg,
        });
    }

    const userId = req.params.user_id;
    let user = await findByUserId(userId);
    if (user === null) {
        return res.status(404).send({
            message: '해당하는 유저를 찾을 수 없습니다.'
        });
    }

    const name = req.body.userName;
    const nickname = req.body.userNickname;
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

        user = await findByUserId(userId);
        return res.status(200).send({
            userName : user.user_name,
            userNickname : user.user_nickname
        });
    } catch (e) {
        console.error(e);
    }
});


const validRequest = (error) => {
    return !error.isEmpty();
}

const findByEmail = async (email) => {
    const user = await User.findAll({
        where: {user_email: email}
    });
    return user.length !== 0;
}

const findByUserEmail = async (email) => {
    return await User.findOne({
        where: {user_email: email}
    });
}

const findByUserId = async (id) => {
    return await User.findByPk(id);
}

module.exports = router;