const Users = require('../models/user');
const {validationResult, check} = require("express-validator");
const router = require('express').Router();
const { Op } = require('sequelize')

//유저 생성
router.post('/',
    [
        check('userEmail', "Email format is not valid").trim().isEmail(),
        check('userEmail','Email is empty').trim().not().isEmpty(),
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

        if(await findByEmail(req.body.userEmail)){
            return res.status(409).send({
                message : 'Email is already use'
            });
        }

        try{
            const user = await Users.create({
                user_name : req.body.userName,
                user_nickname : req.body.userNickname,
                user_email : req.body.userEmail,
                user_password : req.body.userPassword
            });
            return res.status(201).send({
                "userId" : user.user_id,
                "userName" : user.user_name,
                "userNickname" : user.user_nickname,
                "userEmail" : user.user_email
            });

        }catch (e){
            console.error(e);
            next(e);
        }
    });

const validRequest = (error) => {
    return !error.isEmpty();
}

const findByEmail = async (email)=>{
    const user = await Users.findAll({
        where:{user_email : email}
    });
    return user.length !== 0;
}

module.exports = router;