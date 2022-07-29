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
        const hashPw = await bcrypt.hash(password,salt);

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

    const err = validationResult(req);
    if (validRequest(err)) {
        return res.status(400).send({
            message: err.array()[0].msg,
        });
    }

    const userEmail = req.body.userEmail;
    const userPassword = req.body.userPassword;

    if(!await findByEmail(userEmail)){
        return res.status(404).send({
            message: 'Email not found'
        });
    }

    const user = await getUser(userEmail);
    if(user.group_id === null){
        return res.status(404).send({
            message: 'User not join group'
        });
    }

    bcrypt.compare(userPassword, user.user_password,(err, same)=>{
        if(same) {
            return res.status(200).send({
                "userId" : user.user_id,
                "userName" : user.user_name,
                "userNickname" : user.user_nickname,
                "userEmail" : user.group_id
            });
        }
        else {
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