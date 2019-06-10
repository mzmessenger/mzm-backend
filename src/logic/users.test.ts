jest.mock('../lib/logger')

import { ObjectID } from 'mongodb'
import * as db from '../lib/db'
import { setAccount } from './users'

beforeAll(async () => {
  await db.connect()
})

afterAll(async () => {
  await db.close()
})

test('setAccount', async () => {
  const userId = new ObjectID()

  const create = await db.collections.users.insertOne({
    _id: userId,
    account: null
  })

  expect(create.insertedId.toHexString()).toStrictEqual(userId.toHexString())

  const account = 'set'

  await setAccount(userId, account)

  const found = await db.collections.users.findOne({ _id: create.insertedId })

  expect(found._id.toHexString()).toStrictEqual(userId.toHexString())
})
