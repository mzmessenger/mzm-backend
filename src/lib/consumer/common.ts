import { client } from '../redis'
import { logger } from '../logger'

export const initConsumerGroup = async (stream: string, groupName: string) => {
  // create consumer group
  try {
    await client.xgroup('setid', stream, groupName, '$')
  } catch (e) {
    try {
      await client.xgroup('create', stream, groupName, '$', 'MKSTREAM')
    } catch (e) {
      if (e?.toSring().includes('already exists')) {
        return
      }
      logger.error(`failed creating xgroup (${stream}, ${groupName}):`, e)
      throw e
    }
  }
}

export const createParser = (
  handler: (id: string, messages: string[]) => Promise<any>
) => {
  return async (read) => {
    if (!read) {
      return null
    }

    for (const [, val] of read) {
      for (const [id, messages] of val) {
        try {
          await handler(id, messages)
        } catch (e) {
          logger.error('parse error', e, id, messages)
        }
      }
    }
  }
}

export const consumeGroup = async (
  groupName: string,
  consumerName: string,
  stream: string,
  parser: ReturnType<typeof createParser>
) => {
  try {
    const res = await client.xreadgroup(
      'group',
      groupName,
      consumerName,
      'BLOCK',
      '100',
      'COUNT',
      '100',
      'STREAMS',
      stream,
      '>'
    )
    await parser(res)
  } catch (e) {
    logger.error('[read]', stream, e)
  }
  await consumeGroup(groupName, consumerName, stream, parser)
}
