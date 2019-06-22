import { Request } from 'express'
import { ObjectID } from 'mongodb'
import { dropCollection } from '../../jest/testUtil'
import * as db from '../lib/db'
import { init } from '../logic/server'
import { getUserInfo } from './users'

beforeAll(async () => {
  return await db.connect()
})

afterAll(async () => {
  await db.close()
})

beforeEach(() => {
  return dropCollection(db.COLLECTION_NAMES.MESSAGES)
})

async function expectGetUserInfo(req, userId) {
  const user = await getUserInfo((req as any) as Request)

  const found = await db.collections.users.findOne({ _id: userId })

  expect(user.id).toStrictEqual(found._id.toHexString())
  expect(user.account).toStrictEqual(found.account)
}

test('getUserInfo (created user)', async () => {
  const userId = new ObjectID()
  const account = 'aaa'

  await db.collections.users.insertOne({ _id: userId, account })

  const req = {
    headers: {
      'x-user-id': userId.toHexString(),
      'x-twitter-user-name': account
    }
  }

  await expectGetUserInfo(req, userId)
})

test('getUserInfo (init user)', async () => {
  // create general room
  await init()

  const userId = new ObjectID()
  const account = 'aaa'

  const first = await db.collections.users.findOne({ _id: userId })
  expect(first).toStrictEqual(null)

  const req = {
    headers: {
      'x-user-id': userId.toHexString(),
      'x-twitter-user-name': account
    }
  }

  await expectGetUserInfo(req, userId)
})
