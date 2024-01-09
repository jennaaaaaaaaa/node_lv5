import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import Joi from 'joi';
import { imageUploader, uploadWebImage } from '../../assets/imageupload.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

const menuSchema = Joi.object({
   name: Joi.string().min(1).required(),
   description: Joi.string().min(1).required(),
   image: Joi.string().min(1),
   price: Joi.string().min(1).required(),
   order: Joi.number().integer(),
   status: Joi.string().valid('FOR_SALE', 'SOLD_OUT'),
});

//메뉴 등록
router.post('/categories/:categoryId/menus', authMiddleware, imageUploader.single('image'), async (req, res, next) => {
   try {
      const { userId } = req.user;
      if (req.user.userType !== 'OWNER') throw { name: 'ApiOnlyOwnerCanUse' };

      const { categoryId } = req.params;

      if (categoryId === undefined) throw { name: 'ValidationError' };

      const category = await prisma.categories.findFirst({ where: { categoryId: +categoryId } });
      if (!category) throw { name: 'CastError' };

      const validation = await menuSchema.validateAsync(req.body);
      const { name, description, price } = validation;
      req.body.image = req.file.location;

      if (!name || !description || !price) throw { name: 'ValidationError' };

      if (price < 0) {
         throw { name: 'LessThenZero' };
      }

      const lastOrder = await prisma.menus.findFirst({
         orderBy: {
            order: 'desc',
         },
         select: {
            order: true,
         },
      });

      const orderCheck = lastOrder ? lastOrder.order + 1 : 1;

      await prisma.menus.create({
         data: {
            name,
            description,
            image: req.file.location,
            price: +price,
            status: 'FOR_SALE',
            order: orderCheck,
            Category: {
               connect: {
                  categoryId: +categoryId,
               },
            },
            User: {
               connect: {
                  userId: userId,
               },
            },
         },
      });

      return res.status(200).json({ message: '메뉴를 등록하였습니다' });
   } catch (error) {
      next(error);
   }
});

//카테고리별 메뉴조회
router.get('/categories/:categoryId/menus', async (req, res, next) => {
   try {
      const { categoryId } = req.params;

      if (!categoryId) throw { name: 'ValidationError' };

      const category = await prisma.categories.findFirst({ where: { categoryId: +categoryId } });

      if (!category) throw { name: 'CastError' };

      const menus = await prisma.menus.findMany({ where: { CategoryId: +categoryId } });

      return res.status(200).json({ menus });
   } catch (error) {
      next(error);
   }
});

//상세조회
router.get('/categories/:categoryId/menus/:menuId', async (req, res, next) => {
   try {
      const { categoryId, menuId } = req.params;
      if (!categoryId || !menuId) {
         throw { name: 'ValidationError' };
      }

      const category = await prisma.categories.findFirst({ where: { categoryId: +categoryId } });

      if (!category) throw { name: 'CastError' };

      const menu = await prisma.menus.findFirst({
         where: { menuId: +menuId },
         select: {
            menuId: true,
            name: true,
            description: true,
            image: true,
            price: true,
            order: true,
            status: true,
            // Category: {
            //    connect: {
            //       categoryId: +categoryId,
            //    },
            // },
         },
      });

      return res.status(200).json({ data: menu });
   } catch (error) {
      next(error);
   }
});

//수정
router.patch('/categories/:categoryId/menus/:menuId', authMiddleware, async (req, res, next) => {
   try {
      if (req.user.userType !== 'OWNER') throw { name: 'ApiOnlyOwnerCanUse' };
      const { categoryId, menuId } = req.params;

      const category = await prisma.categories.findFirst({ where: { categoryId: +categoryId } });
      if (!category) throw { name: 'CastError' };

      const menu = await prisma.menus.findFirst({ where: { menuId: +menuId } });
      if (!menu) throw { name: 'menuCastError' };

      const validation = await menuSchema.validateAsync(req.body);
      const { name, description, price, order, status } = validation;

      if (!name || !description || !price || !order || !status) throw { name: 'ValidationError' };

      if (price < 0) {
         throw { name: 'LessThenZero' };
      }

      //body에 입력한 order값을 데이터베이스에서 이미 존재하는 값인지 찾음
      const checkExistsOrder = await prisma.menus.findFirst({ where: { order: order } });
      //이미 다른 메뉴로 존재하는 값이라면
      // 찾은 checkExistsOrder 데이터의 id로 찾아서 찾은 메뉴품목의 order 값을
      // 현재 위에서 params로 받은 menuId로 찾은 menu값의 order 값으로 값을 수정해줌
      if (checkExistsOrder) {
         await prisma.menus.update({
            where: { menuId: checkExistsOrder.menuId },
            data: { order: menu.order },
         });
      }

      await prisma.menus.update({
         where: { menuId: +menuId },
         data: { name, description, price: +price, order, status },
      });
      return res.status(200).json({ message: '메뉴를 수정하였습니다.' });
   } catch (error) {
      next(error);
   }
});

//삭제
router.delete('/categories/:categoryId/menus/:menuId', authMiddleware, async (req, res, next) => {
   try {
      if (req.user.userType !== 'OWNER') throw { name: 'ApiOnlyOwnerCanUse' };
      const { categoryId, menuId } = req.params;

      if (!categoryId || !menuId) {
         throw { name: 'ValidationError' };
      }

      const category = await prisma.categories.findFirst({ where: { categoryId: +categoryId } });
      if (!category) throw { name: 'CastError' };

      const menu = await prisma.menus.findFirst({ where: { menuId: +menuId } });
      if (!menu) throw { name: 'menuCastError' };

      await prisma.menus.delete({ where: { menuId: +menuId } });

      return res.status(200).json({ message: '메뉴를 삭제하였습니다' });
   } catch (error) {
      next(error);
   }
});

export default router;
