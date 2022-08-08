const express = require('express');
const path = require('path');
const morgan = require('morgan');
const nunjucks = require('nunjucks');
const bodyParser = require('body-parser');

const groupRouter = require('./routes/groups');
const userRouter = require('./routes/users');
const ingredientRouter = require('./routes/ingredients');
const questRouter = require('./routes/quests');
const choreRouter = require('./routes/chores');
const kingRouter = require('./routes/kings');

const { sequelize } = require('./models/index');
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./swagger-output.json');


const app = express();
app.set('port', process.env.PORT || 3001);
app.set('view engine', 'html');
nunjucks.configure('views', {
    express: app,
    watch: true,
});

sequelize.sync({force: false})
    .then(() => {
        console.log('데이터베이스 연결 성공');
    })
    .catch((err) => {
        console.error(err);
    });

app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.urlencoded({extended : false}));
app.use(bodyParser.json())

app.use('/groups/ingredients',ingredientRouter);
app.use('/groups/quests',questRouter);
app.use('/groups/chores',choreRouter);
app.use('/groups/kings',kingRouter);
app.use('/users',userRouter);
app.use('/groups',groupRouter);
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerFile));

app.use((req, res, next) => {
    const error = new Error(`${req.method} ${req.url} 라우터가 없습니다.`);
    error.status = 404;
    next(error);
});

app.use((err, req, res, next) => {
    res.locals.message = err.message;
    res.locals.error = process.env.NODE_ENV !== 'production' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

app.listen(app.get('port'), () => {
    console.log(app.get('port'), '번 포트에서 대기 중');
});