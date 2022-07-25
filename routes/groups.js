const Groups = require('../models/group');
const {d} = require("nunjucks/src/filters");
const router = require('express').Router();

//그룹 생성
router.post('/',async (req, res, next)=>{
    try {
        const group = await Groups.create({
            group_name : req.body.group_name,
            group_invite_code : req.body.group_invite_code
        });
        console.log(group);
        res.status(201).json(group);
    }catch (err){
        console.error(err);
        next(err);
    }
});

/*const createGroupInviteCode = () => {

    const chs = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
        'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
        'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
        'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
    let ranCode = '';

    do{
        let code = '';
        for(let i=0; i<7; i++){
            let c = chs[Math.floor(Math.random()*chs.length+1)];
            code+=c;
            ranCode = code;
        }
    }while (findByInviteCode(ranCode.toString()))
    return ranCode;
}

const  findByInviteCode = (c) => {
    try {
        const code = Groups.findAll({
            include : {
                model : Groups,
                where : {group_invite_code : c}
            }
        });
        console.log(JSON.stringify(code));
        code.then(data => {
            return data.length !== 0;
        })

    }catch (err){
        console.error(err);
    }

}*/
module.exports = router;