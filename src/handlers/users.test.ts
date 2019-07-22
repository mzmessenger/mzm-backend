jest.mock('../lib/logger')

import { Request } from 'express'
import { ObjectID } from 'mongodb'
import { mongoSetup, dropCollection } from '../../jest/testUtil'
import { BadRequest, NotFound } from '../lib/errors'
import * as db from '../lib/db'
import { getUserInfo, updateAccount } from './users'

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

test('getUserInfo', async () => {
  const userId = new ObjectID()
  const account = 'aaa'

  await db.collections.users.insertOne({ _id: userId, account })

  const req = {
    headers: {
      'x-user-id': userId.toHexString()
    },
    body: {
      account: account
    }
  }

  const user = await getUserInfo((req as any) as Request)

  const found = await db.collections.users.findOne({ _id: userId })

  expect(user.id).toStrictEqual(found._id.toHexString())
  expect(user.account).toStrictEqual(found.account)
})

test('getUserInfo before signUp', async () => {
  expect.assertions(1)

  const userId = new ObjectID()
  const account = null

  await db.collections.users.insertOne({ _id: userId, account })

  const req = {
    headers: {
      'x-user-id': userId.toHexString()
    }
  }

  try {
    await getUserInfo((req as any) as Request)
  } catch (e) {
    expect(e instanceof NotFound).toStrictEqual(true)
  }
})

test.each([
  ['null', null],
  ['undefined', undefined],
  ['空文字', ''],
  ['space', ' '],
  ['space2', '　'],
  ['space3', '　 　']
])('updateAccount fail (account: %s)', async (_label, account) => {
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
    await updateAccount((req as any) as Request)
  } catch (e) {
    expect(e instanceof BadRequest).toStrictEqual(true)
  }
})
