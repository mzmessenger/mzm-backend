jest.mock('../lib/logger')

import { ObjectID } from 'mongodb'
import { GENERAL_ROOM_NAME } from '../config'
import * as db from '../lib/db'
import { init } from './server'
import { popAccount, isValidAccount, initUser } from './users'

beforeAll(async () => {
  await db.connect()
})

afterAll(async () => {
  await db.close()
})

test.each([['aaa', 'aaa'], ['  aaaa', 'aaaa'], ['&aa%><', '&amp;aa%&gt;&lt;']])(
  'popAccount (%s)',
  (arg, answer) => {
    const pop = popAccount(arg)
    expect(pop).toStrictEqual(answer)
  }
)

test.each([
  ['valid1234', true],
  ['  aaaa', false],
  ['a@hoge', false],
  ['a-ho-ge', false],
  ['&amp;aa%&gt;&lt;', false]
])('popAccount (%s)', (arg: string, answer) => {
  const pop = isValidAccount(arg)
  expect(pop).toStrictEqual(answer)
})

test('initUser', async () => {
  // create general room
  await init()

  const userId = new ObjectID()
  const account = 'aaa'

  await initUser(userId, account)

  // user
  const foundUser = await db.collections.users.findOne({ _id: userId })
  expect(userId.toHexString()).toStrictEqual(foundUser._id.toHexString())
  expect(account).toStrictEqual(foundUser.account)

  // default room
  const foundRooms = await db.collections.rooms.find().toArray()
  expect(foundRooms.length).toStrictEqual(1)
  expect(foundRooms[0].name).toStrictEqual(GENERAL_ROOM_NAME)
})
