jest.mock('../lib/logger')

import { Request } from 'express'
import { ObjectID } from 'mongodb'
import { mongoSetup, dropCollection } from '../../jest/testUtil'
import { BadRequest } from '../lib/errors'
import * as db from '../lib/db'
import { init } from '../logic/server'
import { signUp } from './users'

let mongoServer = null
let mongoUri = null

beforeAll(async () => {
  const mongo = await mongoSetup()
  mongoServer = mongo.mongoServer
  mongoUri = mongo.uri
  return await db.connect(mongo.uri)
})

afterAll(async () => {
  await db.close()
  await mongoServer.stop()
})

beforeEach(async () => {
  return dropCollection(mongoUri, db.COLLECTION_NAMES.MESSAGES)
})

test('signUp success', async () => {
  const userId = new ObjectID()
  const account = 'aaa'

  // create general room
  await init()

  const req = {
    headers: {
      'x-user-id': userId.toHexString()
    },
    body: {
      account: account
    }
  }

  await signUp((req as any) as Request)
})

test('signUp already exist', async () => {
  expect.assertions(1)

  const created = new ObjectID()
  const account = 'aaa'

  await db.collections.users.insertOne({ _id: created, account: account })

  const req = {
    headers: {
      'x-user-id': new ObjectID()
    },
    body: {
      account: account
    }
  }

  try {
    await signUp((req as any) as Request)
  } catch (e) {
    expect(e instanceof BadRequest).toStrictEqual(true)
  }
})

test.each([
  ['null', null],
  ['undefined', undefined],
  ['空文字', ''],
  ['space', ' ']
])('signUp fail (account: %s)', async (_label, account) => {
  expect.assertions(1)

  const userId = new ObjectID()

  const req = {
    headers: {
      'x-user-id': userId.toHexString()
    },
    body: {
      account: account
    }
  }

  try {
    await signUp((req as any) as Request)
  } catch (e) {
    expect(e instanceof BadRequest).toStrictEqual(true)
  }
})
