jest.mock('../lib/logger')

import { ObjectID } from 'mongodb'
import { mongoSetup } from '../../jest/testUtil'
import { GENERAL_ROOM_NAME } from '../config'
import * as db from '../lib/db'
import { init } from './server'
import { isValidAccount, initUser } from './users'

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
  const foundRooms = await db.collections.enter
    .aggregate<db.Enter & { room: db.Room[] }>([
      {
        $match: { userId: userId }
      },
      {
        $lookup: {
          from: db.COLLECTION_NAMES.ROOMS,
          localField: 'roomId',
          foreignField: '_id',
          as: 'room'
        }
      }
    ])
    .toArray()

  // general にだけ入室している
  expect(foundRooms.length).toStrictEqual(1)
  expect(foundRooms[0].room[0].name).toStrictEqual(GENERAL_ROOM_NAME)
})
