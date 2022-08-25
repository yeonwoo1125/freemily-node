const Group = require('../models/group');
const Chore = require('../models/chore');
const User = require("../models/user");
const {validationResult, check} = require("express-validator");
const moment = require("moment");
const router = require('express').Router();
const sequelize = require('../models/index').sequelize;

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
router.post('/:groupId/:userId', [
    check('choreTitle', 'Title is empty').trim().not().isEmpty(),
    check('choreCategory', 'Category is empty').trim().not().isEmpty(),
    check('choreDate', 'Date format is not valid').trim().isDate(),
    check('choreUserId', 'UserId is empty').trim().not().isEmpty()
], async (req, res) => {

    const err = validationResult(req);
    if (validRequest(err)) {
        return res.status(400).send({
            msg: err.array()[0].msg,
        });
    }

    const groupId = req.params.groupId * 1;
    const group = await Group.findByGroupId(groupId);
    if (!Group.groupNotFound(group)) {
        return res.status(404).send({
            msg: '해당하는 그룹이 없습니다.'
        });
    }

    const userId = req.params.userId * 1;
    const user = await User.findByUserId(userId);
    if (!User.userNotFound(user)) {
        return res.status(404).send({
            msg: '해당하는 유저를 찾을 수 없습니다.'
        });
    }

    if (!User.userNotInGroup(user, groupId)) {
        return res.status(404).send({
            msg: '그룹 안에 해당하는 유저를 찾을 수 없습니다.'
        });
    }

    let {choreTitle, choreCategory, choreDate, choreUserId} = req.body;
    if (!validEnum(ChoreCategory, choreCategory)) {
        return res.status(400).send({
            msg: 'enum에 없는 값입니다.'
        });
    }

    const choreUser = await User.findByUserId(choreUserId);
    if (!User.userNotFound(user)) {
        return res.status(404).send({
            msg: '해당하는 유저를 찾을 수 없습니다.'
        });
    }

    if (choreUser.group_id !== groupId) {
        return res.status(404).send({
            msg: '집안일을 하는 유저가 해당하는 그룹에 가입하지 않았습니다.'
        });
    }

    choreDate = new Date(choreDate);
    if (choreDate < Date.now()) {
        return res.status(409).send({
            msg: '이미 집안일 날짜가 지났습니다.'
        });
    }

    if (await checkChore(choreCategory, choreDate, choreUserId)) {
        return res.status(409).send({
            msg: '이미 생성된 심부름입니다.'
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
router.put('/:groupId/:choreId/certify', async (req, res) => {
    const groupId = req.params.groupId * 1;
    const group = await Group.findByGroupId(groupId);
    if (!Group.groupNotFound(group)) {
        return res.status(404).send({
            msg: '해당하는 그룹이 없습니다.'
        });
    }

    const choreId = req.params.choreId * 1;
    let chore = await Chore.findByChoreId(choreId);
    if (!Chore.choreNotFound(chore)) {
        return res.status(404).send({
            msg: '해당하는 집안일을 찾을 수 없습니다.'
        });
    }

    if (!Chore.choreNotInGroup(chore, groupId)) {
        return res.status(404).send({
            msg: '그룹에 해당하는 집안일을 찾을 수 없습니다.'
        });
    }

    if (chore.chore_check === ChoreCheck.SUCCESS || chore.chore_check === ChoreCheck.REQUEST) {
        return res.status(409).send({
            msg: '이미 인증 요청된 집안일입니다.'
        })
    }

    if (chore.chore_check === ChoreCheck.FAIL) {
        return res.status(409).send({
            msg: '이미 실패한 집안일입니다.'
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

        chore = await Chore.findByChoreId(choreId);
        if (chore.chore_check === ChoreCheck.REQUEST) {
            return res.status(200).send({
                msg: '집안일 인증 요청이 완료되었습니다.'
            });
        }
    } catch (e) {
        console.error(e);
    }
});

//당번 하루 목록
router.get('/:groupId/one-day', async (req, res) => {
    const groupId = req.params.groupId * 1;
    const group = await Group.findByGroupId(groupId);
    if (!Group.groupNotFound(group)) {
        return res.status(404).send({
            msg: '해당하는 그룹이 없습니다.'
        });
    }

    const date = req.query.date;
    if (!checkDateFormat(date, 'YYYY-MM-DD')) {
        return res.status(400).send({
            msg: '날짜 형식이 올바르지 않습니다.'
        });
    }

    try {
        const chores = await Chore.findAll({
            where: {
                group_id: groupId,
                chore_date: date
            },
            attributes: [['chore_id', 'choreId'], ['chore_user_id', 'choreUserId'], ['chore_title', 'choreTitle'],
                ['chore_category', 'choreCategory'], ['createdAt', 'createdDate'], ['updatedAt', 'modifiedDate']]
        });

        return res.status(200).json(chores);
    } catch (e) {
        console.error(e);
    }
});

//당번 삭제
router.delete('/:groupId/:choreId', async (req, res) => {
    const groupId = req.params.groupId * 1;
    const group = await Group.findByGroupId(groupId);
    if (!Group.groupNotFound(group)) {
        return res.status(404).send({
            msg: '해당하는 그룹이 없습니다.'
        });
    }

    const choreId = req.params.choreId * 1;
    let chore = await Chore.findByChoreId(choreId);
    if (!Chore.choreNotFound(chore)) {
        return res.status(404).send({
            msg: '해당하는 집안일을 찾을 수 없습니다.'
        });
    }

    if (!Chore.choreNotInGroup(chore, groupId)) {
        return res.status(404).send({
            msg: '그룹에 해당하는 집안일을 찾을 수 없습니다.'
        });
    }

    if (chore.chore_check === ChoreCheck.FAIL || chore.chore_check === ChoreCheck.SUCCESS) {
        return res.status(405).send({
            msg: '이미 완료한 집안일입니다.'
        });
    }

    try {
        await Chore.destroy({
            where: {chore_id: choreId}
        });

        return res.status(200).send({
            msg: '집안일이 삭제되었습니다.'
        })
    } catch (e) {
        console.error(e);
    }
});

//인증 요청에 대한 응답
router.put('/:groupId/:choreId/reaction', [
    check('reaction', 'Reaction is empty').trim().not().isEmpty()
], async (req, res) => {
    const err = validationResult(req);
    if (validRequest(err)) {
        return res.status(400).send({
            msg: err.array()[0].msg,
        });
    }

    const groupId = req.params.groupId * 1;
    const group = await Group.findByGroupId(groupId);
    if (!Group.groupNotFound(group)) {
        return res.status(404).send({
            msg: '해당하는 그룹이 없습니다.'
        });
    }

    const choreId = req.params.choreId * 1;
    const chore = await Chore.findByChoreId(choreId);
    if (!Chore.choreNotFound(chore)) {
        return res.status(404).send({
            msg: '해당하는 집안일을 찾을 수 없습니다.'
        });
    }

    if (!Chore.choreNotInGroup(chore, groupId)) {
        return res.status(404).send({
            msg: '그룹에 해당하는 집안일을 찾을 수 없습니다.'
        });
    }

    switch (chore.chore_check) {
        case ChoreCheck.BEFORE : {
            return res.status(409).send({
                msg: '인증 요청되지 않은 집안일입니다.'
            });
        }
        case ChoreCheck.SUCCESS : {
            return res.status(409).send({
                msg: '이미 성공한 집안일입니다.'
            });
        }
        case ChoreCheck.FAIL : {
            return res.status(409).send({
                msg: '이미 실패한 집안일입니다.'
            });
        }
    }

    const check = req.body.reaction;
    if (!validEnum(ChoreCheck, check)) {
        return res.status(400).send({
            msg: 'Check에 해당하는 값이 없습니다.'
        });
    }

    try {
        await Chore.update(
            {
                chore_check: check
            },
            {
                where: {chore_id: choreId}
            }
        );
    } catch (e) {
        console.error(e);
    }

    return res.status(200).send({
        msg: '집안일이 완료되었습니다.'
    })
});

//당번 한달 목록
router.get('/:groupId', async (req, res) => {
    const groupId = req.params.groupId * 1;
    const group = await Group.findByGroupId(groupId);
    if (!Group.groupNotFound(group)) {
        return res.status(404).send({
            msg: '해당하는 그룹이 없습니다.'
        });
    }

    const date = new Date(req.query.date);
    if (!checkDateFormat(date, 'YYYY-MM')) {
        return res.status(400).send({
            msg: '날짜 형식이 올바르지 않습니다.'
        });
    }
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    try {
        const list = await Chore.findAll({
            attributes: [['chore_id', 'choreId'], ['chore_user_id', 'choreUserId'],
                ['chore_title', 'choreTitle'], ['chore_category', 'choreCategory'], ['chore_date', 'choreDate']],
            where: {
                group_id: groupId,
                Op: sequelize.where(sequelize.fn('year', sequelize.col('chore_date')), '=', year),
                andOp: sequelize.where(sequelize.fn('month', sequelize.col('chore_date')), '=', month),
            }
        });
        return res.status(200).json(list);
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

const checkDateFormat = (date, format) => {
    return moment(date, format).isValid();
}

module.exports = router;