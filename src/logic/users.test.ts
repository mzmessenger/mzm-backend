jest.mock('../lib/logger')

import { ObjectID } from 'mongodb'
import { mongoSetup } from '../../jest/testUtil'
import { GENERAL_ROOM_NAME } from '../config'
import * as db from '../lib/db'
import { initGeneral } from './rooms'
import { isValidAccount, initUser, getAllUserIdsInRoom } from './users'

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
  ['valid_1234', true],
  ['a-ho-ge', true],
  ['  aaaa', false],
  ['a@hoge', false],
  ['&amp;aa%&gt;&lt;', false],
  ['@hoge', false],
  ['insert', false],
  ['update', false],
  ['find', false],
  ['remove', false],
  ['removed', false],
  ['X-', false],
  ['x-', false],
  ['yx-', true]
])('isValidAccount (%s)', (arg: string, answer) => {
  const isValid = isValidAccount(arg)
  expect(isValid).toStrictEqual(answer)
})

test('initUser', async () => {
  await initGeneral()

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

test('getAllUserIdsInRoom', async () => {
  const roomId = new ObjectID()
  const users = [new ObjectID(), new ObjectID(), new ObjectID()]
  const userIdStrs = users.map(user => user.toHexString())
  const enter: db.Enter[] = users.map(user => {
    return {
      roomId: roomId,
      userId: user
    }
  })

  await db.collections.enter.insertMany(enter)

  const ids = await getAllUserIdsInRoom(roomId.toHexString())

  expect(ids.length).toStrictEqual(users.length)
  for (const id of ids) {
    expect(userIdStrs.includes(id)).toStrictEqual(true)
  }
})
