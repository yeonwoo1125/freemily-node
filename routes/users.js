const Users = require('../models/user');
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
                message: 'Email is already use'
            });
        }

        const salt = 12;
        const password = req.body.userPassword;
        const hashPw = await bcrypt.hash(password, salt);

        try {
            const user = await Users.create({
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
            message: 'Email not found'
        });
    }

    const user = await getUser(userEmail);
    if (user.group_id === null) {
        return res.status(404).send({
            message: 'User not join group'
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
                message: 'Email and password mismatch'
            })
        }
    });
})

const validRequest = (error) => {
    return !error.isEmpty();
}

const findByEmail = async (email) => {
    const user = await Users.findAll({
        where: {user_email: email}
    });
    return user.length !== 0;
}

const getUser = async (email) => {
    return await Users.findOne({
        where: {user_email: email}
    });
}

module.exports = router;