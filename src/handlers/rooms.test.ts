jest.mock('../lib/logger')

import { Request } from 'express'
import { ObjectID } from 'mongodb'
import { GENERAL_ROOM_NAME } from '../config'
import * as db from '../lib/db'
import { init } from '../logic/server'
import { BadRequest } from '../lib/errors'
import { exitRoom } from './rooms'

beforeAll(async () => {
  await db.connect()
})

afterAll(async () => {
  await db.close()
})

function exitRoomRequest(userId: ObjectID, roomId: string): Request {
  const req = {
    headers: {
      'x-user-id': userId.toHexString()
    },
    body: {
      room: roomId
    }
  }

  return (req as any) as Request
}

test('exitRoom fail (general)', async () => {
  // create general
  await init()

  const userId = new ObjectID()

  const general = await db.collections.rooms.findOne({
    name: GENERAL_ROOM_NAME
  })

  await db.collections.enter.insertOne({
    userId: userId,
    roomId: general._id
  })

  const req = exitRoomRequest(userId, general._id.toHexString())

  try {
    await exitRoom(req)
  } catch (e) {
    expect(e instanceof BadRequest).toStrictEqual(true)
  }
})

test.each([[null, '']])('exitRoom BadRequest (%s)', async arg => {
  expect.assertions(1)

  const req = exitRoomRequest(new ObjectID(), arg)

  try {
    await exitRoom((req as any) as Request)
  } catch (e) {
    expect(e instanceof BadRequest).toStrictEqual(true)
  }
})
