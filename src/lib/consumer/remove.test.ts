jest.mock('../logger')
jest.mock('../redis')

import { ObjectID } from 'mongodb'
import { mongoSetup, getMockType } from '../../../jest/testUtil'
import * as db from '../db'
import redis from '../redis'
import { remove } from './remove'

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

test('remove', async () => {
  const xack = getMockType(redis.xack)
  xack.mockClear()
  xack.mockResolvedValue('resolve')

  const userId = new ObjectID()
  const roomIds = [new ObjectID(), new ObjectID()]
  await db.collections.users.insertOne({ _id: userId, account: 'test' })
  const insert = roomIds.map(roomId => {
    return { userId, roomId }
  })
  await db.collections.enter.insertMany(insert)

  const before = await db.collections.removed.find({ _id: userId }).toArray()
  expect(before.length).toStrictEqual(0)

  await remove('queue-id', ['user', userId.toHexString()])

  const removed = await db.collections.removed
    .find({ originId: userId })
    .toArray()
  expect(removed.length).toStrictEqual(1)
  const roomIdString = roomIds.map(r => r.toHexString())
  for (const r of removed) {
    expect(r.enter.length).toStrictEqual(roomIds.length)
    for (const e of r.enter) {
      expect(roomIdString.includes(e.toHexString())).toStrictEqual(true)
    }
  }

  const enter = await db.collections.enter.find({ userId }).toArray()
  expect(enter.length).toStrictEqual(0)

  expect(xack.mock.calls.length).toStrictEqual(1)
  expect(xack.mock.calls[0][2]).toStrictEqual('queue-id')
})
