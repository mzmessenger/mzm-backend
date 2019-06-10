jest.mock('../lib/logger')

import { ObjectID } from 'mongodb'
import * as db from '../lib/db'
import { enterRoom } from './rooms'

beforeAll(async () => {
  return await db.connect()
})

afterAll(async () => {
  await db.close()
})

test('enterRoom', async () => {
  const roomId = new ObjectID()
  const userId = new ObjectID()

  const before = await db.collections.enter
    .find({
      userId: userId,
      roomId: roomId
    })
    .toArray()

  expect(before.length).toStrictEqual(0)

  await enterRoom(userId, roomId)

  const found = await db.collections.enter
    .find({
      userId: userId,
      roomId: roomId
    })
    .toArray()

  expect(found.length).toStrictEqual(1)
  expect(found[0].roomId.toHexString()).toStrictEqual(roomId.toHexString())
  expect(found[0].userId.toHexString()).toStrictEqual(userId.toHexString())
})
