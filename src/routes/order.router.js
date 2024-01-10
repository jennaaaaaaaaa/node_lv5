import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import Joi from 'joi';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

const orderSchema = Joi.object({
   status: Joi.string().valid('ACCEPTED', 'PENDING', 'CANCEL').optional(),
});

const orderMenuSchema = Joi.object({
   menuId: Joi.number().integer().required(),
   quantity: Joi.number().integer().required(),
});

//메뉴 주문
router.post('/orders', authMiddleware, async (req, res, next) => {
   try {
      const { userId } = req.user;
      if (req.user.userType !== 'CUSTOMER') throw { name: 'ApiOnlyCustomerCanUse' };

      //order 데이터값
      const validation = await orderMenuSchema.validateAsync(req.body);
      const { menuId, quantity } = validation;

      if (!userId) throw { name: 'NeedloginService' };
      if (!validation) throw { name: 'ValidationError' };

      //메뉴 여러개 주문가능하게 하는 코드
      //   const orderMenuData = await Promise.all(
      //      orderMenus.map(async ({ menuId, quantity }) => {
      //         const menu = await prisma.menus.findUnique({ where: { menuId } });
      //         if (!menu) throw { name: 'menuCastError' };

      //         totalPrice += menu.price * quantity;

      //         //메뉴 주문한 만큼 수량 감소
      //         await prisma.menus.update({
      //            where: { menuId },
      //            data: {
      //               availableQuantity: menu.availableQuantity - quantity,
      //            },
      //         });

      //         return {
      //            MenuId: menuId,
      //            quantity: quantity,
      //         };
      //      })
      //   );
      //________________________________________
      //주문생성
      // const order = await prisma.orders.create({
      //     data: {
      //        UserId: userId,
      //        totalPrice: totalPrice,
      //        status: 'PENDING',
      //        Menus: {
      //           create: orderMenuData,
      //        },
      //     },
      //  });

      const menu = await prisma.menus.findUnique({ where: { menuId } });
      if (!menu) throw { name: 'menuCastError' };

      //prisma.orders.create는 Orders 테이블에 데이터를 생성하겠다는 의미
      //그 안에 있는 Menus 부분은 Orders 테이블과 Menus 테이블 사이의 관계를 설정하고
      //OrderMenus 테이블에 데이터를 생성하겠다는 의미
      //주문생성
      const order = await prisma.orders.create({
         data: {
            UserId: userId,
            totalPrice: menu.price * quantity,
            status: 'PENDING',
            Menus: {
               create: {
                  MenuId: menuId,
                  quantity: quantity,
               },
            },
         },
      });

      //메뉴 주문한 만큼 수량 감소
      if (menu.availableQuantity - quantity > 0) {
         await prisma.menus.update({
            where: { menuId },
            data: {
               availableQuantity: menu.availableQuantity - quantity,
            },
         });
      } else {
         await prisma.menus.update({
            where: { menuId },
            data: {
               availableQuantity: 0,
               status: 'SOLD_OUT',
            },
         });
      }

      return res.status(200).json({ message: '메뉴 주문에 성공하였습니다' });
   } catch (error) {
      next(error);
   }
});

//주문내역조회(소비자)
router.get('/orders/customer', authMiddleware, async (req, res, next) => {
   try {
      const { userId } = req.user;
      if (!userId) throw { name: 'NeedloginService' };
      if (req.user.userType !== 'CUSTOMER') throw { name: 'ApiOnlyCustomerCanUse' };

      const orders = await prisma.orders.findMany({
         where: { UserId: +userId, deletedAt: null },
         select: {
            orderId: true,
            totalPrice: true,
            status: true,
            createdAt: true,
            OrderMenus: {
               select: {
                  quantity: true,
                  Menu: {
                     select: {
                        name: true,
                        price: true,
                     },
                  },
               },
            },
         },
      });
      return res.status(200).json({ data: orders });
   } catch (error) {
      next(error);
   }
});
//소비자 주문내역으로 받아야할 정보 status, menu(name, 가격), quantity, totalPirce, createdAt(주문시간)

//주문내역조회(사장님)
router.get('/orders/owner', authMiddleware, async (req, res, next) => {
   try {
      const { userId } = req.user;
      if (!userId) throw { name: 'NeedloginService' };
      if (req.user.userType !== 'OWNER') throw { name: 'ApiOnlyOwnerCanUse' };

      const orders = await prisma.orders.findMany({
         where: { deletedAt: null },
         select: {
            orderId: true,
            User: {
               select: {
                  userId: true,
                  nickname: true,
               },
            },
            OrderMenus: {
               include: {
                  Menu: true, // `Menus` 대신 `Menu`를 사용해야 합니다.
               },
            },
            status: true,
            createdAt: true,
            totalPrice: true,
         },
      });

      // 필요한 필드만 추출
      const refinedOrders = orders.map((order) => ({
         ...order, //orders를 하나씩 객체로 담은, order의 모든 속성을 복사한 새로운 객체
         OrderMenus: order.OrderMenus.map((orderMenu) => ({
            ...orderMenu,
            Menu: {
               name: orderMenu.Menu.name,
               price: orderMenu.Menu.price,
            },
         })),
      }));

      return res.status(200).json({ data: refinedOrders });
   } catch (error) {
      next(error);
   }
});

//주문내역상태 변경
router.patch('/orders/:orderId/status', authMiddleware, async (req, res, next) => {
   try {
      const { userId } = req.user;
      if (!userId) throw { name: 'NeedloginService' };
      if (req.user.userType !== 'OWNER') throw { name: 'ApiOnlyOwnerCanUse' };

      const { orderId } = req.params;

      //유효성검사
      const validation = await orderSchema.validateAsync(req.body);
      const { status } = validation;
      if (!orderId || !status) throw { name: 'ValidationError' };

      const order = await prisma.orders.findUnique({ where: { orderId: +orderId } });
      if (!order) throw { name: 'orderCastError' };

      await prisma.orders.update({ where: { orderId: +orderId }, data: { status } });

      return res.status(200).json({ message: '주문내역을 수정하였습니다.' });
   } catch (error) {
      next(error);
   }
});

export default router;
