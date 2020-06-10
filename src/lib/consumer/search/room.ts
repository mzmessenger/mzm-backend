import * as config from '../../../config'
import { logger } from '../../../lib/logger'
import { client as redis } from '../../redis'
import {
  initAlias,
  insertRooms as _insertRooms
} from '../../elasticsearch/rooms'
import { initConsumerGroup, createParser, consumeGroup } from '../common'

const STREAM = config.stream.ELASTICSEARCH_ROOMS
const ELASTICSEARCH_ROOMS_GROUP = 'group:elasticsearch:rooms'

export const initSearchRoomConsumerGroup = async () => {
  await initConsumerGroup(STREAM, ELASTICSEARCH_ROOMS_GROUP)
}

export const insertRooms = async (ackid: string, messages: string[]) => {
  const roomIds = JSON.parse(messages[1])

  await _insertRooms(roomIds)

  await redis.xack(STREAM, ELASTICSEARCH_ROOMS_GROUP, ackid)
  logger.info('[insert:elasticsearch:rooms]', roomIds)
}

const consumer = async (ackid: string, messages: string[]) => {
  if (messages[0] === 'init') {
    await initAlias()
    logger.info('[init:elasticsearch:rooms]')
  } else if (messages[0] === 'rooms') {
    await insertRooms(ackid, messages)
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
