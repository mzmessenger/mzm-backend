import redis from './redis'
import logger from './logger'
import { SendMessage } from '../types'

export async function addQueueToUser(target: string, data: SendMessage) {
  const message = JSON.stringify({ ...data, user: target })
  await redis.xadd('stream:socket:message', '*', 'message', message)
  logger.info('[queue:add:user]', message)
}
