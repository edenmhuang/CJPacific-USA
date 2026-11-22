import { authenticate, configureStoreSearch, defineMiddlewares, validateAndTransformBody } from '@medusajs/framework/http'
import { StageBody } from './admin/orders/[id]/cj-stage/route'
import { requireBusinessCart } from './store/cj/require-business'

export default defineMiddlewares({
  routes: [
    {
      method: ['POST'],
      matcher: '/store/search',
      middlewares: [configureStoreSearch({ allowed_indexes: { product: true } })],
    },
    {
      // Only signed-in business accounts can turn a cart into an order.
      method: ['POST'],
      matcher: '/store/carts/:id/complete',
      middlewares: [authenticate('customer', ['session', 'bearer']), requireBusinessCart],
    },
    {
      matcher: '/store/cj/orders*',
      middlewares: [authenticate('customer', ['session', 'bearer'])],
    },
    {
      method: ['POST'],
      matcher: '/admin/orders/:id/cj-stage',
      middlewares: [validateAndTransformBody(StageBody)],
    },
  ],
})
