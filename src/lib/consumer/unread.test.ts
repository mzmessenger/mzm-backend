jest.mock('../logger')
jest.mock('../redis', () => {
  return {
    client: {
      xack: jest.fn()
    }
  }
})

import { ObjectID } from 'mongodb'
import { mongoSetup, getMockType } from '../../../jest/testUtil'
import { UnreadQueue } from '../../types'
import * as db from '../db'
import * as redis from '../redis'
import { increment } from './unread'

let mongoServer = null

beforeAll(async () => {
  const mongo = await mongoSetup()
  mongoServer = mongo.mongoServer
  return await db.connect(mongo.uri)
})

afterAll(async () => {
  await db.close()
  await mongoServer.stop()
})

test('increment', async () => {
  const xack = getMockType(redis.client.xack)
  xack.mockClear()
  xack.mockResolvedValue('resolve')

  const maxIndex = 1
  const maxValue = 100

  const userIds = [new ObjectID(), new ObjectID(), new ObjectID()]
  const users: db.User[] = userIds.map((userId) => {
    return { _id: userId, account: userId.toHexString(), roomOrder: [] }
  })
  await db.collections.users.insertMany(users)
  const roomId = new ObjectID()
  const enter = userIds.map((userId) => ({ userId, roomId, unreadCounter: 0 }))
  // max test
  enter[maxIndex].unreadCounter = maxValue
  await db.collections.enter.insertMany(enter)

  const _unreadQueue: UnreadQueue = {
    roomId: roomId.toHexString(),
    messageId: new ObjectID().toHexString()
  }
  const unreadQueue = JSON.stringify(_unreadQueue)
  await increment('queue-id', ['unread', unreadQueue])

  let targets = await db.collections.enter
    .find({ userId: { $in: userIds }, roomId })
    .toArray()
  expect(targets.length).toStrictEqual(enter.length)
  for (const target of targets) {
    if (target.userId.toHexString() === userIds[maxIndex].toHexString()) {
      // ignore max
      expect(target.unreadCounter).toStrictEqual(maxValue)
    } else {
      // +1
      expect(target.unreadCounter).toStrictEqual(1)
    }
  }
  expect(xack.mock.calls.length).toStrictEqual(1)
  expect(xack.mock.calls[0][2]).toStrictEqual('queue-id')

  // call twice
  await increment('queue-id', ['unread', unreadQueue])

  targets = await db.collections.enter
    .find({ userId: { $in: userIds }, roomId })
    .toArray()
  for (const target of targets) {
    if (target.userId.toHexString() === userIds[maxIndex].toHexString()) {
      // ignore max
      expect(target.unreadCounter).toStrictEqual(maxValue)
    } else {
      // +1
      expect(target.unreadCounter).toStrictEqual(2)
    }
  }
})
