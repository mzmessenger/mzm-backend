import { ObjectID } from 'mongodb'
import { UNREAD_STREAM } from '../../config'
import { UnreadQueue } from '../../types'
import * as db from '../db'
import redis from '../redis'
import logger from '../logger'
import { initConsumerGroup, createParser, consumeGroup } from './common'

const UNREAD_GROUP = 'group:remove:user'

export const initUnreadConsumerGroup = async () => {
  await initConsumerGroup(UNREAD_STREAM, UNREAD_GROUP)
}

export const increment = async (ackid: string, messages: string[]) => {
  const queue = JSON.parse(messages[1]) as UnreadQueue

  await db.collections.enter.updateMany(
    { roomId: new ObjectID(queue.roomId), unreadCounter: { $lt: 100 } },
    { $inc: { unreadCounter: 1 } }
  )
  await redis.xack(UNREAD_STREAM, UNREAD_GROUP, ackid)

  logger.info('[unread:increment]', queue.roomId)
}

export const consumeUnread = async () => {
  const parser = createParser(increment)
  await consumeGroup(UNREAD_GROUP, 'consume-backend', UNREAD_STREAM, parser)
}
