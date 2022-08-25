const Group = require('../models/group');
const Ingredient = require('../models/ingredient');
const {validationResult, check} = require("express-validator");
const moment = require('moment');
const router = require('express').Router();
const Op = require('sequelize').Op;


const IngredientSaveType = {
    FRIDGE: 'FRIDGE',
    FREEZER: 'FREEZER',
    ROOM_TEMP: 'ROOM_TEMP'
}
Object.freeze(IngredientSaveType);

const IngredientCategory = {
    VEGGIE: 'VEGGIE',
    FRUIT: 'FRUIT',
    SEA_FOOD: 'SEA_FOOD',
    GRAIN: 'GRAIN',
    MEAT: 'MEAT',
    SEASONING: 'SEASONING',
    BEVERAGE: 'BEVERAGE',
    PROCESSED_FOOD: 'PROCESSED_FOOD',
    SNACK: 'SNACK',
    DAIRY_PRODUCT: 'DAIRY_PRODUCT',
    SIDE_DISH: 'SIDE_DISH',
    ETC: 'ETC'
};
Object.freeze(IngredientCategory);


//식재료 생성
router.post('/:groupId', [
    check('ingredientName', 'Name is empty').trim().not().isEmpty(),
    check('ingredientSaveType', 'Save type is empty').trim().not().isEmpty(),
    check('ingredientPurchaseDate', 'Purchase date is empty').trim().not().isEmpty(),
    check('ingredientExpirationDate', 'Expiration date is empty').trim().not().isEmpty(),
    check('ingredientCount', 'Count is empty').trim().not().isEmpty(),
    check('ingredientPurchaseDate', 'Date format is not valid').trim().isDate(),
    check('ingredientExpirationDate', 'Date format is not valid').trim().isDate(),

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

    if (checkIngredientCount(req.body.ingredientCount)) {
        return res.status(409).send({
            msg: '식재료의 수가 0입니다.'
        });
    }

    if (!validEnum(IngredientCategory, req.body.ingredientCategory)) {
        return res.status(400).send({
            msg: 'category에 해당하는 값이 없습니다.'
        });
    }

    if (!validEnum(IngredientSaveType, req.body.ingredientSaveType)) {
        return res.status(400).send({
            msg: 'save type에 해당하는 값이 없습니다.'
        });
    }

    const purchase = moment(req.body.ingredientPurchaseDate).format('YYYY-MM-DD');
    const expiration = moment(req.body.ingredientExpirationDate).format('YYYY-MM-DD');

    try {
        const ingredient = await Ingredient.create({
            ingredient_name: req.body.ingredientName,
            ingredient_save_type: req.body.ingredientSaveType,
            ingredient_purchase_date: purchase,
            ingredient_expiration_date: expiration,
            ingredient_category: req.body.ingredientCategory,
            ingredient_count: req.body.ingredientCount,
            ingredient_memo: req.body.ingredientMemo,
            group_id: groupId
        });
        return res.status(201).json(ingredient);
    } catch (e) {
        console.error(err);
    }
});

//식재료 전체 조회
router.get('/:groupId', async (req, res) => {
    const groupId = req.params.groupId * 1;
    const group = await Group.findByGroupId(groupId);
    if (!Group.groupNotFound(group)) {
        return res.status(404).send({
            msg: '해당하는 그룹이 없습니다.'
        });
    }

    const saveType = req.query.saveType;
    const saveType_attr = {};
    if (saveType) {
        if (!validEnum(IngredientSaveType, saveType)) {
            return res.status(409).send({
                msg: 'save type에 없는 값입니다.'
            });
        }
        saveType_attr[Op.eq] = saveType;
    } else saveType_attr[Op.not] = null;

    try {
        const ingredients = await Ingredient.findAll({
            attributes: [
                ['ingredient_id', 'ingredientId'], ['ingredient_name', 'ingredientName'], ['ingredient_save_type', 'ingredientSaveType'],
                ['ingredient_category', 'ingredientCategory'], ['ingredient_expiration_date', 'ingredientExpirationDate'],
                ['ingredient_purchase_date', 'ingredientPurchaseDate'], ['ingredient_count', 'ingredientCount']
            ],
            where: {
                'ingredient_save_type': saveType_attr
            }
        })
        return res.status(200).json(ingredients);
    } catch (e) {
        console.error(e);
    }
});

//식재료 상세 조회
router.get('/:groupId/details/:ingredientId', async (req, res) => {
    const groupId = req.params.groupId * 1;
    const group = await Group.findByGroupId(groupId);
    if (!Group.groupNotFound(group)) {
        return res.status(404).send({
            msg: '해당하는 그룹이 없습니다.'
        });
    }

    const ingredientId = req.params.ingredientId * 1;
    let ingredient = await Ingredient.findByIngredientId(ingredientId);
    if (!Ingredient.ingredientNotFound(ingredient)) {
        return res.status(404).send({
            msg: '해당하는 식재료를 찾을 수 없습니다.'
        });
    }

    if (!Ingredient.ingredientNotInGroup(ingredient, groupId)) {
        return res.status(404).send({
            msg: '그룹에 해당하는 식재료를 찾을 수 없습니다.'
        })
    }

    ingredient = await Ingredient.findByPk(ingredientId, {
        attributes: [['ingredient_name', 'ingredientName'], ['ingredient_save_type', 'ingredientSaveType'], ['ingredient_purchase_date', 'ingredientPurchaseDate'],
            ['ingredient_expiration_date', 'ingredientExpirationDate'], ['ingredient_category', 'ingredientCategory'],
            ['ingredient_count', 'ingredientCount'], ['ingredient_memo', 'ingredientMemo']]
    });

    return res.status(200).json(ingredient);
});

//식재료 삭제
router.delete('/:groupId', async (req, res) => {
    const groupId = req.params.groupId * 1;
    const group = await Group.findByGroupId(groupId);
    if (!Group.groupNotFound(group)) {
        return res.status(404).send({
            msg: '해당하는 그룹이 없습니다.'
        });
    }

    const ingredients = req.body;
    for (let i of ingredients) {
        const ingredientId = i.ingredientId;
        const ingredient = await Ingredient.findByIngredientId(ingredientId);
        if (!Ingredient.ingredientNotFound(ingredient)) {
            return res.status(404).send({
                msg: '해당하는 식재료를 찾을 수 없습니다.'
            });
        }

        if (!Ingredient.ingredientNotInGroup(ingredient, groupId)) {
            return res.status(404).send({
                msg: '그룹에 해당하는 식재료를 찾을 수 없습니다.'
            })
        }

        try {
            await Ingredient.destroy({
                where: {ingredient_id: ingredientId}
            });
        } catch (e) {
            console.error(e);
        }
    }
    return res.status(200).send({
        msg: '식재료들이 삭제되었습니다.'
    })
});

//식재료 수정
router.put('/:groupId/:ingredientId', [
    check('ingredientName', 'Name is empty').trim().not().isEmpty(),
    check('ingredientSaveType', 'Save type is empty').trim().not().isEmpty(),
    check('ingredientPurchaseDate', 'Purchase date is empty').trim().not().isEmpty(),
    check('ingredientExpirationDate', 'Expiration date is empty').trim().not().isEmpty(),
    check('ingredientCount', 'Count is empty').trim().not().isEmpty(),
    check('ingredientPurchaseDate', 'Date format is not valid').trim().isDate(),
    check('ingredientExpirationDate', 'Date format is not valid').trim().isDate(),
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

    const ingredientId = req.params.ingredientId;
    let ingredient = await Ingredient.findByIngredientId(ingredientId);
    if (!Ingredient.ingredientNotFound(ingredient)) {
        return res.status(404).send({
            msg: '해당하는 식재료를 찾을 수 없습니다.'
        });
    }

    if (!Ingredient.ingredientNotInGroup(ingredient, groupId)) {
        return res.status(404).send({
            msg: '그룹에 해당하는 식재료를 찾을 수 없습니다.'
        })
    }

    const {
        ingredientName,
        ingredientSaveType,
        ingredientPurchaseDate,
        ingredientExpirationDate,
        ingredientCategory,
        ingredientCount,
        ingredientMemo
    } = req.body;

    if (!validEnum(IngredientCategory, ingredientCategory)) {
        return res.status(400).send({
            msg: 'category에 해당하는 값이 없습니다.'
        });
    }

    if (!validEnum(IngredientSaveType, ingredientSaveType)) {
        return res.status(400).send({
            msg: 'save type에 해당하는 값이 없습니다.'
        });
    }

    if (checkIngredientCount(ingredientCount)) {
        try {
            await Ingredient.destroy({
                where: {ingredient_id: ingredientId}
            });

            return res.status(200).send({
                msg: '식재료가 삭제되었습니다.'
            })
        } catch (e) {
            console.error(e);
        }
    }

    await Ingredient.update(
        {
            ingredient_name: ingredientName,
            ingredient_save_type: ingredientSaveType,
            ingredient_purchase_date: ingredientPurchaseDate,
            ingredient_expiration_date: ingredientExpirationDate,
            ingredient_category: ingredientCategory,
            ingredient_count: ingredientCount,
            ingredient_memo: ingredientMemo
        },
        {
            where: {ingredient_id: ingredientId}
        }
    )

    ingredient = await Ingredient.findByPk(ingredientId, {
        attributes: [['ingredient_name', 'ingredientName'], ['ingredient_save_type', 'ingredientSaveType'], ['ingredient_purchase_date', 'ingredientPurchaseDate'],
            ['ingredient_expiration_date', 'ingredientExpirationDate'], ['ingredient_category', 'ingredientCategory'],
            ['ingredient_count', 'ingredientCount'], ['ingredient_memo', 'ingredientMemo']]
    });

    return res.status(200).json(ingredient);
});

//식재료 개수 일괄 수정
router.put('/:groupId', async (req, res) => {
    const groupId = req.params.groupId * 1;
    const group = await Group.findByGroupId(groupId);
    if (!Group.groupNotFound(group)) {
        return res.status(404).send({
            msg: '해당하는 그룹이 없습니다.'
        });
    }

    const ingredients = req.body;
    for (let i of ingredients) {
        const ingredientId = i.ingredientId * 1;
        const ingredient = await Ingredient.findByIngredientId(ingredientId);
        if (!Ingredient.ingredientNotFound(ingredient)) {
            return res.status(404).send({
                msg: '해당하는 식재료를 찾을 수 없습니다.'
            });
        }

        if (!Ingredient.ingredientNotInGroup(ingredient, groupId)) {
            return res.status(404).send({
                msg: '그룹에 해당하는 식재료를 찾을 수 없습니다.'
            })
        }

        const ingredientCount = i.ingredientCount;
        if (checkIngredientCount(ingredientCount)) {
            try {
                await Ingredient.destroy({
                    where: {ingredient_id: ingredientId}
                });
            } catch (e) {
                console.error(e);
            }
        }

        await Ingredient.update(
            {
                ingredient_count: ingredientCount
            },
            {
                where: {ingredient_id: ingredientId}
            }
        );
    }

    return res.status(200).send({
        msg: '식재료의 개수가 수정되었습니다.'
    });
});

const validEnum = (e, d) => {
    return Object.values(e).includes(d);
};

const validRequest = (error) => {
    return !error.isEmpty();
};

const checkIngredientCount = (count) => {
    let list = [];
    for (let i of count) {
        list.push(i);
    }
    let s = 0;
    for (let i of list) {
        if (!isNaN(i * 1) && i * 1 !== 0) s++;
    }
    return s === 0;
};

module.exports = router;