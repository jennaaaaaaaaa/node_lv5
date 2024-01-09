import express from 'express';
import Joi from 'joi';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();
// 조이 유효성 검사 추가
const schema = Joi.object({
   name: Joi.string().min(2).max(20).required(),
   order: Joi.number().max(50),
});

// 조이를 통한 유효성 검사 및 에러 추가
// 카테고리 등록 API
router.post('/categories', authMiddleware, async (req, res, next) => {
   try {
      const { userId } = req.user;
      if (req.user.userType !== 'OWNER') throw { name: 'ApiOnlyOwnerCanUse' };
      const validation = await schema.validateAsync(req.body);
      const { name } = validation;

      if (!name) {
         throw { name: 'ValidationError' };
      }

      const user = await prisma.users.findFirst({ where: { userId } });

      const lastCategory = await prisma.categories.findFirst({
         orderBy: { order: 'desc' },
      });

      const newOrder = lastCategory ? lastCategory.order + 1 : 1;

      const createCategory = await prisma.categories.create({
         data: {
            name,
            order: newOrder,
            User: {
               connect: {
                  userId: user.userId,
               },
            },
         },
      });
      return res.status(200).json({ message: '카테고리를 등록 하였습니다.', data: createCategory });
   } catch (err) {
      next(err);
   }
});

// 카테고리 목록 조회 API
router.get('/categories', async (req, res, next) => {
   try {
      const categories = await prisma.categories.findMany({
         select: {
            categoryId: true,
            name: true,
            order: true,
         },
         orderBy: [{ order: 'asc' }],
      });
      return res.status(200).json({ data: categories });
   } catch (err) {
      next(err);
   }
});

// 유효성 검사 및 에러 핸들링 추가.
// 카테고리 수정 API
router.patch('/categories/:categoryId', authMiddleware, async (req, res, next) => {
   try {
      // const { userId } = req.user;
      if (req.user.userType !== 'OWNER') throw { name: 'ApiOnlyOwnerCanUse' };
      const { categoryId } = req.params;

      if (!categoryId) throw { name: 'ValidationError' };

      const category = await prisma.categories.findUnique({
         where: { categoryId: +categoryId },
      });
      if (!category) throw { name: 'CastError' };

      const validation = await schema.validateAsync(req.body);
      // console.log('validationvalidationvalidationv', validation.error);
      const { name, order } = validation;
      if (!name || order === undefined) throw { name: 'ValidationError' };

      // if (validation.error) throw { name: "ValidationError" };
      // const { orders, name } = validation.value

      //body에 입력한 order값을 데이터베이스에서 이미 존재하는 값인지 찾음
      const checkExistsOrder = await prisma.categories.findFirst({ where: { order: order } });
      //이미 다른 메뉴로 존재하는 값이라면
      // 찾은 checkExistsOrder 데이터의 id로 찾아서 찾은 메뉴품목의 order 값을
      // 현재 위에서 params로 받은 categoryId로 찾은 category값의 order 값으로 값을 수정해줌
      console.log('checkExistsOrdercheckExistsOrder', checkExistsOrder);
      if (checkExistsOrder) {
         await prisma.categories.update({
            where: { categoryId: checkExistsOrder.categoryId },
            data: { order: category.order },
         });
      }

      const updatedCategoryResult = await prisma.categories.update({
         where: { categoryId: +categoryId },
         data: { name, order },
      });

      return res.status(200).json({ message: '수정에 성공했습니다.', data: updatedCategoryResult });
   } catch (err) {
      next(err);
   }
});

// 카테고리 삭제 API
router.delete('/categories/:categoryId', authMiddleware, async (req, res, next) => {
   try {
      if (req.user.userType !== 'OWNER') throw { name: 'ApiOnlyOwnerCanUse' };

      const { categoryId } = req.params;

      const category = await prisma.categories.findUnique({
         where: { categoryId: +categoryId },
      });
      if (!category) throw { name: 'CastError' };
      if (!categoryId) throw { name: 'ValidationError' };
      await prisma.categories.delete({
         where: { categoryId: +categoryId },
      });
      return res.status(200).json({ message: '카테고리 정보를 삭제하였습니다.' });
   } catch (err) {
      next(err);
   }
});

export default router;
