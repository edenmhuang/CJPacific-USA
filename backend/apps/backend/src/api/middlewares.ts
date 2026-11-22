import { authenticate, defineMiddlewares, validateAndTransformBody } from '@medusajs/framework/http'
import { StageBody } from './admin/orders/[id]/cj-stage/route'
import { requireBusinessCart } from './store/cj/require-business'
import { requireInStockCart, requireInStockLine } from './store/cj/require-in-stock'

export default defineMiddlewares({
  routes: [
    {
      // Only signed-in business accounts can turn a cart into an order.
      method: ['POST'],
      matcher: '/store/carts/:id/complete',
      middlewares: [authenticate('customer', ['session', 'bearer']), requireBusinessCart, requireInStockCart],
    },
    {
      // Out-of-stock products cannot be added or increased in a cart.
      method: ['POST'],
      matcher: '/store/carts/:id/line-items',
      middlewares: [requireInStockLine],
    },
    {
      method: ['POST'],
      matcher: '/store/carts/:id/line-items/:line_id',
      middlewares: [requireInStockLine],
    },
    {
      matcher: '/store/cj/orders*',
      middlewares: [authenticate('customer', ['session', 'bearer'])],
    },
    {
      matcher: '/store/cj/email-verification',
      middlewares: [authenticate('customer', ['session', 'bearer'])],
    },
    {
      method: ['POST'],
      matcher: '/admin/orders/:id/cj-stage',
      middlewares: [validateAndTransformBody(StageBody)],
    },
  ],
})
