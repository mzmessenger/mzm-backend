import * as config from '../../../config'
import { logger } from '../../../lib/logger'
import { client as redis } from '../../redis'
import {
  initAlias,
  insertRooms as _insertRooms
} from '../../elasticsearch/rooms'
import { initConsumerGroup, createParser, consumeGroup } from '../common'
import { RoomQueueType } from '../../../types'

const STREAM = config.stream.ELASTICSEARCH_ROOMS
const ELASTICSEARCH_ROOMS_GROUP = 'group:elasticsearch:rooms'

export const initSearchRoomConsumerGroup = async () => {
  await initConsumerGroup(STREAM, ELASTICSEARCH_ROOMS_GROUP)
}

export const insertRooms = async (ackid: string, messages: string[]) => {
  const roomIds = JSON.parse(messages[1])

  await _insertRooms(roomIds)

  await redis.xack(STREAM, ELASTICSEARCH_ROOMS_GROUP, ackid)
  logger.info('[insert:elasticsearch:rooms]', roomIds.length)
}

const consumer = async (ackid: string, messages: string[]) => {
  if (messages[0] === RoomQueueType.INIT) {
    await initAlias()
    logger.info('[init:elasticsearch:rooms]')
    return
  } else if (messages[0] === RoomQueueType.ROOM) {
    await insertRooms(ackid, messages)
    return
  }
}

export const consumeSearchRooms = async () => {
  const parser = createParser(consumer)
  await consumeGroup(
    ELASTICSEARCH_ROOMS_GROUP,
    'consume-backend',
    STREAM,
    parser
  )
}
