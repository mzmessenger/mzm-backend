import { ObjectID } from 'mongodb'
import * as config from '../../config'
import { ReplyQueue } from '../../types'
import * as db from '../db'
import { client } from '../redis'
import { logger } from '../logger'
import { initConsumerGroup, createParser, consumeGroup } from './common'

const REPLY_GROUP = 'group:reply'

export const initReplyConsumerGroup = async () => {
  await initConsumerGroup(config.stream.REPLY_STREAM, REPLY_GROUP)
}

export const reply = async (ackid: string, messages: string[]) => {
  const queue = JSON.parse(messages[1]) as ReplyQueue

  await db.collections.enter.updateOne(
    {
      userId: new ObjectID(queue.userId),
      roomId: new ObjectID(queue.roomId),
      replied: { $lt: 100 }
    },
    { $inc: { replied: 1 } }
  )
  await client.xack(config.stream.REPLY_STREAM, REPLY_GROUP, ackid)

  logger.info('[reply]', 'roomId:', queue.roomId, 'userId:', queue.userId)
}

export const consumeReply = async () => {
  const parser = createParser(reply)
  await consumeGroup(
    REPLY_GROUP,
    'consume-backend',
    config.stream.REPLY_STREAM,
    parser
  )
}
