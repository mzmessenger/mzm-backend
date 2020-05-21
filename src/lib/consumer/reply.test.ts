jest.mock('../logger')
jest.mock('../redis')

import { ObjectID } from 'mongodb'
import { mongoSetup, getMockType } from '../../../jest/testUtil'
import { ReplyQueue } from '../../types'
import * as db from '../db'
import redis from '../redis'
import { reply } from './reply'

let mongoServer = null

beforeAll(async () => {
  const mongo = await mongoSetup()
  mongoServer = mongo.mongoServer
  return await db.connect(mongo.uri)
})

afterAll(async () => {
  await db.close()
  await mongoServer.stop()
  await redis.disconnect()
})

test('reply', async () => {
  const xack = getMockType(redis.xack)
  xack.mockClear()
  xack.mockResolvedValue('resolve')

  const userId = new ObjectID()
  await db.collections.users.insertOne({
    _id: userId,
    account: userId.toHexString(),
    roomOrder: []
  })

  const roomId = new ObjectID()
  const enter = await db.collections.enter.insertOne({
    userId,
    roomId,
    unreadCounter: 0,
    replied: 0
  })

  const _replyQueue: ReplyQueue = {
    roomId: roomId.toHexString(),
    userId: userId.toHexString()
  }
  const replyQueue = JSON.stringify(_replyQueue)
  await reply('queue-id', ['unread', replyQueue])

  let target = await db.collections.enter.findOne({ _id: enter.insertedId })
  expect(target.replied).toStrictEqual(1)
  expect(xack.mock.calls.length).toStrictEqual(1)
  expect(xack.mock.calls[0][2]).toStrictEqual('queue-id')

  // call twice
  await reply('queue-id', ['unread', replyQueue])

  target = await db.collections.enter.findOne({ _id: enter.insertedId })
  expect(target.replied).toStrictEqual(2)
})
