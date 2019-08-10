jest.mock('../logger')
jest.mock('../redis')

import { ObjectID } from 'mongodb'
import { mongoSetup, getMockType } from '../../../jest/testUtil'
import * as db from '../db'
import redis from '../redis'
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
  const xack = getMockType(redis.xack)
  xack.mockClear()
  xack.mockResolvedValue('resolve')

  const userIds = [new ObjectID(), new ObjectID()]
  const users = userIds.map((userId, i) => {
    return { _id: userId, account: `account-${i}` }
  })
  await db.collections.users.insertMany(users)
  const roomId = new ObjectID()
  const enter = userIds.map(userId => ({ userId, roomId, unreadCounter: 0 }))
  await db.collections.enter.insertMany(enter)

  const unreadQueue = JSON.stringify({ roomId: roomId.toHexString() })
  await increment('queue-id', ['unread', unreadQueue])

  let targets = await db.collections.enter
    .find({ userId: { $in: userIds }, roomId })
    .toArray()
  expect(targets.length).toStrictEqual(enter.length)
  for (const target of targets) {
    expect(target.unreadCounter).toStrictEqual(1)
  }
  expect(xack.mock.calls.length).toStrictEqual(1)
  expect(xack.mock.calls[0][2]).toStrictEqual('queue-id')

  await increment('queue-id', ['unread', unreadQueue])
  targets = await db.collections.enter
    .find({ userId: { $in: userIds }, roomId })
    .toArray()
  for (const target of targets) {
    expect(target.unreadCounter).toStrictEqual(2)
  }
})
