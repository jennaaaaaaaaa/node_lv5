import express from 'express';
import menuRouter from './routes/menu.router.js';
import categoryRouter from './routes/category.router.js';
import userRouter from './routes/user.router.js';
import errorHandlingMiddleware from './middlewares/error.handling.middleware.js';
import cookieParser from 'cookie-parser';

const app = express();
const port = 3000;

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use('/api', [categoryRouter, menuRouter, userRouter]);
app.use(errorHandlingMiddleware); // 미들웨어를 적용 시키기 위해 추가한 부분 !

app.listen(port, () => {
   console.log(port, '서버열림');
});
