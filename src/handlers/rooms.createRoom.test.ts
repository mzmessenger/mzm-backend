jest.mock('../lib/logger')

import { ObjectID } from 'mongodb'
import { mongoSetup, createRequest } from '../../jest/testUtil'
import * as db from '../lib/db'
import { BadRequest } from '../lib/errors'
import { createRoom } from './rooms'

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
  ['aaa', 'aaa'],
  ['日本語　', '日本語'],
  ['🍣', '🍣']
])('createRoom success (%s, %s)', async (name, createdName) => {
  const userId = new ObjectID()
  const body = { name }
  const req = createRequest(userId, { body })

  const { id } = await createRoom(req)

  const created = await db.collections.rooms.findOne({
    _id: new ObjectID(id)
  })

  expect(created.name).toStrictEqual(createdName)
  expect(created.createdBy).toStrictEqual(userId.toHexString())
})

test.each([
  ['slash', '/hoge/fuga'],
  ['back slash', 't\\t'],
  ['space', 'aaa bbb'],
  ['max length', 'a'.repeat(81)],
  ['min length', ''],
  ['start with @', '@foo'],
  ['&', '&room'],
  ['?', '?room'],
  ['=', '=room']
])('createRoom fail (%s)', async (_label, name) => {
  expect.assertions(1)

  const userId = new ObjectID()
  const body = { name }
  const req = createRequest(userId, { body })

  try {
    await createRoom(req)
  } catch (e) {
    expect(e instanceof BadRequest).toStrictEqual(true)
  }
})

test.each([
  ['00A0', '\u00A0'],
  ['2001', ' '],
  ['2003', ' '],
  ['200C', '‌'],
  ['0323', '『̣'],
  ['200B', '​'],
  ['2029', '\u2029'],
  ['202A', '‪']
])('createRoom fail unicode (%s)', async (_label, name) => {
  expect.assertions(1)

  const userId = new ObjectID()
  const body = { name }
  const req = createRequest(userId, { body })

  try {
    await createRoom(req)
  } catch (e) {
    expect(e instanceof BadRequest).toStrictEqual(true)
  }
})
