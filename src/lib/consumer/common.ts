import redis from '../redis'
import logger from '../logger'

export async function initConsumerGroup(stream: string, groupName: string) {
  // create consumer group
  try {
    await redis.xgroup('setid', stream, groupName, '$')
  } catch (e) {
    try {
      await redis.xgroup('create', stream, groupName, '$')
    } catch (e) {
      logger.error(`failed creating xgroup (${stream}, ${groupName}):`, e)
    }
  }
}

export function createParser(
  handler: (id: string, messages: string[]) => Promise<any>
) {
  return async function(read) {
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

export async function consumeGroup(
  groupName: string,
  consumerName: string,
  stream: string,
  parser: ReturnType<typeof createParser>
) {
  try {
    const res = await redis.xreadgroup(
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
