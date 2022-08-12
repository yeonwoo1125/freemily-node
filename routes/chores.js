const Group = require('../models/group');
const Chore = require('../models/chore');
const User = require("../models/user");
const {validationResult, check} = require("express-validator");
const moment = require("moment");
const router = require('express').Router();
const Op = require('sequelize').Op;

const ChoreCategory = {
    DISH_WASHING: 'DISH_WASHING',
    SHOPPING: 'SHOPPING',
    COOK: 'COOK'
};
Object.freeze(ChoreCategory);

const ChoreCheck = {
    BEFORE: 'BEFORE',
    REQUEST: 'REQUEST',
    SUCCESS: 'SUCCESS',
    FAIL: 'FAIL'
};
Object.freeze(ChoreCheck);


//당번 생성
router.post('/:group_id/:user_id', [
    check('choreTitle', 'Title is empty').trim().not().isEmpty(),
    check('choreCategory', 'Category is empty').trim().not().isEmpty(),
    check('choreDate', 'Date format is not valid').trim().isDate(),
    check('choreUserId', 'UserId is empty').trim().not().isEmpty()
], async (req, res) => {

    const err = validationResult(req);
    if (validRequest(err)) {
        return res.status(400).send({
            message: err.array()[0].msg,
        });
    }

    const groupId = req.params.group_id * 1;
    const group = await findByGroupId(groupId);
    if (group === null) {
        return res.status(404).send({
            message: '해당하는 그룹을 찾을 수 없습니다.'
        });
    }

    const userId = req.params.user_id * 1;
    const user = await findByUserId(userId);
    if (user === null) {
        return res.status(404).send({
            message: '해당하는 유저를 찾을 수 없습니다.'
        });
    }

    if (user.group_id !== groupId) {
        return res.status(404).send({
            message: '해당 그룹에 유저가 가입하지 않았습니다.'
        });
    }

    let {choreTitle, choreCategory, choreDate, choreUserId} = req.body;
    if (!validEnum(ChoreCategory, choreCategory)) {
        return res.status(404).send({
            message: 'enum에 없는 값입니다.'
        });
    }

    const choreUser = await findByUserId(choreUserId);
    if (choreUser === null) {
        return res.status(404).send({
            message: '집안일을 하는 유저를 찾을 수 없습니다.'
        });
    }

    if (choreUser.group_id !== groupId) {
        return res.status(404).send({
            message: '집안일을 하는 유저가 해당하는 그룹에 가입하지 않았습니다.'
        });
    }

    choreDate = new Date(choreDate);
    if (choreDate < Date.now()) {
        return res.status(409).send({
            message: '이미 집안일 날짜가 지났습니다.'
        });
    }

    if (await checkChore(choreCategory, choreDate, choreUserId)) {
        return res.status(409).send({
            message: '이미 생성된 심부름입니다.'
        })
    }

    try {
        const chore = await Chore.create({
            chore_title: choreTitle,
            chore_category: choreCategory,
            chore_date: choreDate,
            chore_check: ChoreCheck.BEFORE,
            group_id: groupId,
            chore_user_id: choreUserId
        });
        return res.status(201).json(chore);
    } catch (e) {
        console.error(e)
    }

});

//당번 인증 요청 보내기
router.put('/:group_id/:chore_id/certify', async (req, res) => {
    const groupId = req.params.group_id * 1;
    const group = await findByGroupId(groupId);
    if (group === null) {
        return res.status(404).send({
            message: '해당하는 그룹을 찾을 수 없습니다.'
        });
    }

    const choreId = req.params.chore_id * 1;
    let chore = await findByChoreId(choreId);
    if (chore === null) {
        return res.status(404).send({
            message: '해당하는 집안일을 찾을 수 없습니다.'
        });
    }

    if (groupId !== chore.group_id) {
        return res.status(404).send({
            message: '집안일이 해당 그룹에 없습니다.'
        });
    }

    if (chore.chore_check === ChoreCheck.SUCCESS || chore.chore_check === ChoreCheck.REQUEST) {
        return res.status(409).send({
            message: '이미 인증 요청된 집안일입니다.'
        })
    }

    if (chore.chore_check === ChoreCheck.FAIL) {
        return res.status(409).send({
            message: '이미 실패한 집안일입니다.'
        })
    }

    try {
        await Chore.update(
            {
                chore_check: ChoreCheck.REQUEST
            },
            {
                where: {chore_id: choreId}
            }
        );

        chore = await findByChoreId(choreId);
        if (chore.chore_check === ChoreCheck.REQUEST) {
            return res.status(200).send({
                message: '집안일 인증 요청이 완료되었습니다.'
            });
        }
    } catch (e) {
        console.error(e);
    }
});

//당번 하루 목록
router.get('/:group_id/one-day', async (req, res) => {
    const groupId = req.params.group_id * 1;
    const group = await findByGroupId(groupId);
    if (group === null) {
        return res.status(404).send({
            message: '해당하는 그룹을 찾을 수 없습니다.'
        });
    }

    const date = req.query.date;
    if (!checkDateFormat(date)) {
        return res.status(400).send({
            message: '날짜 형식이 올바르지 않습니다.'
        });
    }

    try {
        const chores = await Chore.findAll({
            where: {
                group_id: groupId,
                chore_date: date
            }
        });

        return res.status(200).json(chores);
    } catch (e) {
        console.error(e);
    }
});

//당번 삭제
router.delete('/:group_id/:chore_id', async (req, res) => {
    const groupId = req.params.group_id * 1;
    const group = await findByGroupId(groupId);
    if (group === null) {
        return res.status(404).send({
            message: '해당하는 그룹을 찾을 수 없습니다.'
        });
    }

    const choreId = req.params.chore_id * 1;
    let chore = await findByChoreId(choreId);
    if (chore === null) {
        return res.status(404).send({
            message: '해당하는 집안일을 찾을 수 없습니다.'
        });
    }

    if (groupId !== chore.group_id) {
        return res.status(404).send({
            message: '집안일이 해당 그룹에 존재하지 않습니다.'
        });
    }

    if (chore.chore_check === ChoreCheck.FAIL || chore.chore_check === ChoreCheck.SUCCESS) {
        return res.status(405).send({
            message: '이미 완료한 집안일입니다.'
        });
    }

    try {
        await Chore.destroy({
            where : {chore_id : choreId}
        });

        return res.status(200).send({
            message : '집안일이 삭제되었습니다.'
        })
    } catch (e) {
        console.error(e);
    }
});

const validEnum = (e, d) => {
    return Object.values(e).includes(d);
};

const validRequest = (error) => {
    return !error.isEmpty();
};

const findByGroupId = async (id) => {
    return await Group.findByPk(id);
};

const findByUserId = async (id) => {
    return await User.findByPk(id);
};

const checkChore = async (category, date, id) => {
    const chore = await Chore.findOne({
        where: {
            chore_category: category,
            chore_date: date,
            chore_user_id: id
        }
    });
    return chore !== null;
}

const findByChoreId = async (id) => {
    return await Chore.findByPk(id);
}

const checkDateFormat = (date) => {
    return moment(date, 'YYYY-MM-DD').isValid();
}

module.exports = router;