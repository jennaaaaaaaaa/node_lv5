import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import Joi from 'joi';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();

const userSchema = Joi.object({
   nickname: Joi.string()
      .min(3)
      .max(15)
      .pattern(/^[a-zA-Z0-9]*$/)
      .required(),
   password: Joi.string().min(8).max(20).required(),
   userType: Joi.string().valid('OWNER', 'CUSTOMER').optional(),
});

//회원가입
router.post('/sign-up', async (req, res, next) => {
   try {
      const validation = await userSchema.validateAsync(req.body);
      const { nickname, password, userType } = validation;

      //조이 유효성 검사에서 빈값인 경우를 이미 설정해놨는데 또 에러처리 해야되는지
      if (!nickname || !password) throw { name: 'ValidationError' };

      //nickname 중복체크
      const user = await prisma.users.findFirst({ where: { nickname } });
      if (user) throw { name: 'DuplicateNickname' };

      //비밀번호에 닉네임이 포함된 경우 에러처리
      if (password.includes(nickname)) {
         throw { name: 'SignUpFail' };
      }

      //비밀번호 암호화
      const hashedPassword = await bcrypt.hash(password, 10);

      await prisma.users.create({
         data: {
            nickname,
            password: hashedPassword,
            userType,
         },
      });

      return res.status(200).json({ message: '회원가입이 완료되었습니다.' });
   } catch (error) {
      next(error);
   }
});

//로그인
router.post('/sign-in', async (req, res, next) => {
   try {
      const validate = await userSchema.validateAsync(req.body);
      const { nickname, password } = validate;
      if (!nickname || !password) throw { name: 'ValidationError' };

      const user = await prisma.users.findFirst({ where: { nickname } });
      if (!user) throw { name: 'NotExistNickname' };

      //   console.log('user', user);

      //nickname으로 찾은 user의 비밀번호(암호화된비밀번호)랑 입력받은 비밀번호랑 같은지 (bcrypt.compare) 확인
      if (await bcrypt.compare(password, user.password)) throw { name: 'NotMatchPassword' };

      //로그인에 성공한다면 jwt 생성
      const token = jwt.sign({ userId: user.userId }, 'Secrect_Key', { expiresIn: '1h' });

      // 쿠키로 전달
      res.cookie('authorization', `Bearer ${token}`);
      return res.status(200).json({ message: '로그인에 성공하였습니다.' });
   } catch (error) {
      next(error);
   }
});

export default router;
