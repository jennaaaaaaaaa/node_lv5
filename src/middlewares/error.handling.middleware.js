// 에러 핸들링 추가 부분.
export default function (err, req, res, next) {
   try {
      console.error('errerrerrerrerrerrerr', err);
      if (err.name === 'ValidationError') {
         // console.error(err.details[0]);
         if (err.details[0].context.key === 'nickname') {
            return res.status(400).json({ message: '닉네임 형식에 일치하지 않습니다.' });
         }
         return res.status(400).json({ errorMessage: '데이터 형식이 올바르지 않습니다.' });
      } else if (err.name === 'CastError') {
         return res.status(404).json({ errorMessage: '존재 하지 않는 카테고리 입니다.' });
      } else if (err.name === 'menuCastError') {
         return res.status(404).json({ errorMessage: '존재하지 않는 메뉴입니다.' });
      } else if (err.name === 'orderCastError') {
         return res.status(404).json({ errorMessage: '존재하지 않는 주문내역입니다.' });
      } else if (err.name === 'LessThenZero') {
         return res.status(404).json({ errorMessage: '메뉴 가격은 0보다 작을 수 없습니다.' });
      } else if (err.name === 'SignUpFail') {
         return res.status(400).json({ errorMessage: '비밀번호 형식에 일치하지 않습니다.' });
      } else if (err.name === 'DuplicateNickname') {
         return res.status(409).json({ errorMessage: '중복된 닉네임입니다.' });
      } else if (err.name === 'NotExistNickname') {
         return res.status(401).json({ errorMessage: '존재하지 않는 닉네임입니다.' });
      } else if (err.name === 'NotMatchPassword') {
         return res.status(401).json({ errorMessage: '비밀번호가 일치하지 않습니다.' });
      } else if (err.name === 'ApiOnlyOwnerCanUse') {
         return res.status(401).json({ errorMessage: '사장님만 사용할 수 있는 API입니다.' });
      } else if (err.name === 'ApiOnlyCustomerCanUse') {
         return res.status(401).json({ errorMessage: '소비자만 사용할 수 있는 API입니다.' });
      } else if (err.name === 'NeedloginService') {
         return res.status(401).json({ errorMessage: '로그인이 필요한 서비스입니다.' });
      }
      next(err);
   } catch (err) {
      res.status(500).json({ errorMessage: '서버 내부 에러가 발생했습니다.' });
   }
}
