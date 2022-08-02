const Groups = require('../models/group');
const Ingredients = require('../models/ingredient');
const {validationResult, check} = require("express-validator");
const moment = require('moment');
const router = require('express').Router();
const Op = require('sequelize').Op;


const ingredientSaveType = {
    FRIDGE: '냉장',
    FREEZER: '냉동',
    ROOM_TEMP: '실온'
}
Object.freeze(ingredientSaveType);

const ingredientCategory = {
    VEGGIE: '채소',
    FRUIT: '과일',
    SEA_FOOD: '해산물',
    GRAIN: '곡물',
    MEAT: '육류',
    SEASONING: '양념',
    BEVERAGE: '음료',
    PROCESSED_FOOD: '가공식품',
    SNACK: '간식',
    DAIRY_PRODUCT: '유제품',
    SIDE_DISH: '반찬',
    ETC: '기타'
};
Object.freeze(ingredientCategory);


//식재료 생성
router.post('/:group_id/ingredients', [
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
            message: err.array()[0].msg,
        });
    }

    const groupId = req.params.group_id * 1;
    if (!await findByGroupId(groupId)) {
        return res.status(404).send({
            message: 'Group Not Found'
        });
    }

    if (!checkIngredientCount(req.body.ingredientCount)) {
        return res.status(409).send({
            message: 'Count is zero'
        });
    }

    if (!validEnum(ingredientCategory, req.body.ingredientCategory)) {
        return res.status(409).send({
            message: 'Not in valid category enum'
        });
    }

    if (!validEnum(ingredientSaveType, req.body.ingredientSaveType)) {
        return res.status(409).send({
            message: 'Not in valid save type enum'
        });
    }

    const purchase = moment(req.body.ingredientPurchaseDate).format('YYYY-MM-DD');
    const expiration = moment(req.body.ingredientExpirationDate).format('YYYY-MM-DD');

    try {
        const ingredient = await Ingredients.create({
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
router.get('/:group_id/ingredients', async (req, res) => {
    const groupId = req.params.group_id * 1;
    console.log(groupId);
    if (!await findByGroupId(groupId)) {
        return res.status(404).send({
            message: 'Group Not Found'
        });
    }


    const saveType = req.query.saveType;
    /*if(saveType === null){
        try{
            const ingredients = await Ingredients.findAll();
            console.log(ingredients);
            return res.status(200).json(ingredients);
        }catch (e){
            console.error(e);
        }
    }
    else {
        try{
            const ingredients = await Ingredients.findAll(
                {where : {ingredient_save_type : saveType}}
            );
            console.log(ingredients);
            return res.status(200).json(ingredients);
        }catch (e){
            console.error(e);
        }
    }*/
    const saveType_attr = {};
    if (saveType) {
        if (!validEnum(ingredientSaveType, saveType)) {
            return res.status(409).send({
                message: 'Not in valid save type enum'
            });
        }
        saveType_attr[Op.eq] = saveType;
    } else saveType_attr[Op.not] = null;

    try {
        const ingredients = await Ingredients.findAll({
            where: {
                'ingredient_save_type': saveType_attr
            }
        })
        console.log(ingredients)
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
    const group = await Groups.findByPk(id);
    return group !== null;
};

const checkIngredientCount = (count) => {
    let list = new Array(count);
    let s = 0;
    for (let i of list) {
        if (!isNaN(i * 1)) s += i + 1;
    }
    return s === 0;
};

module.exports = router;