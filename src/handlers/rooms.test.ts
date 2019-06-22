jest.mock('../lib/logger')

import { Request } from 'express'
import { ObjectID } from 'mongodb'
import { GENERAL_ROOM_NAME } from '../config'
import * as db from '../lib/db'
import { init } from '../logic/server'
import { exitRoom } from './rooms'
import { BadRequest } from '../lib/errors'

beforeAll(async () => {
  await db.connect()
})

afterAll(async () => {
  await db.close()
})

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

  const req = {
    headers: {
      'x-user-id': userId.toHexString()
    },
    body: {
      room: general._id.toHexString()
    }
  }

  try {
    await exitRoom((req as any) as Request)
  } catch (e) {
    expect(e instanceof BadRequest).toStrictEqual(true)
  }
})

test.each([[null, '']])('exitRoom BadRequest (%s)', async arg => {
  expect.assertions(1)

  const req = {
    headers: {
      'x-user-id': new ObjectID().toHexString()
    },
    body: {
      room: arg
    }
  }

  try {
    await exitRoom((req as any) as Request)
  } catch (e) {
    expect(e instanceof BadRequest).toStrictEqual(true)
  }
})
