jest.mock('../lib/logger')

import { Request } from 'express'
import { ObjectID } from 'mongodb'
import { dropCollection } from '../../jest/testUtil'
import { BadRequest } from '../lib/errors'
import * as db from '../lib/db'
import { init } from '../logic/server'
import { signUp } from './users'

beforeAll(async () => {
  return await db.connect()
})

afterAll(async () => {
  return await db.close()
})

beforeEach(async () => {
  return await dropCollection(db.COLLECTION_NAMES.USERS)
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
