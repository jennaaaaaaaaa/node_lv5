import jwt from 'jsonwebtoken'; //jwt 사용할 수 있도록
import { prisma } from '../utils/prisma/index.js';

export default async function (req, res, next) {
   try {
      const { authorization } = req.cookies;

      const [tokenType, token] = authorization.split(' ');
      if (tokenType !== 'Bearer') throw new Error('토큰 타입이 일치하지 않습니다');

      const decodedToken = jwt.verify(token, 'Secrect_Key');
      const userId = decodedToken.userId; // 문자열

      const user = await prisma.users.findFirst({
         where: { userId: +userId },
      });
      if (!user) {
         //userId가 없을 때 쿠기를 삭제 userId를 조회했는데 user가 없다면 정상적이지 않은 쿠키
         res.clearCookie('authorization');
         throw new Error('토큰 사용자가 존재하지 않습니다'); //catch로 error를 넘김
      }
      req.user = user;
      next();
   } catch (error) {
      //쿠키 인증에 실패 시 쿠키를 삭제 시켜줌
      res.clearCookie('authorization');
      switch (error.name) {
         case 'TokenExpiredError': //실제 토큰이 만료되었을 때 발생하는 에러
            return res.status(401).json({ message: '토큰이 만료되었습니다' });
            break;
         case 'JsonWebTokenError': //토큰에 검증이 실패했을 때 발생하는 에러
            return res.status(401).json({ message: '토큰 인증에 실패하였습니다' });
         default:
            return res.status(401).json({ message: error.message ?? '비정상적인  요청입니다' });
      }
   }
}
