import { adminHandlers } from './admin'
import { authHandlers } from './auth'
import { catalogHandlers } from './catalog'
import { ordersHandlers } from './orders'

export const handlers = [...authHandlers, ...catalogHandlers, ...ordersHandlers, ...adminHandlers]
