jest.mock('../lib/logger')

import { Request, Response } from 'express'
import { mongoSetup } from '../../jest/testUtil'
import { errorHandler, checkLogin, init } from './server'
import * as HttpErrors from '../lib/errors'
import * as db from '../lib/db'
import { GENERAL_ROOM_NAME } from '../config'

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

test('errorHandler (Internal Server Error)', cb => {
  expect.assertions(4)

  const error = new Error('error!')

  const send = jest.fn(function(arg) {
    expect(this.status.mock.calls.length).toBe(1)
    expect(this.send.mock.calls.length).toBe(1)

    expect(this.status.mock.calls[0][0]).toEqual(500)
    expect(arg).toEqual('Internal Server Error')

    cb()
  })

  const res = { status: jest.fn().mockReturnThis(), send }

  errorHandler(error, {}, (res as any) as Response, jest.fn())
})

test.each([
  [{ error: new HttpErrors.BadRequest('BadRequest') }],
  [{ error: new HttpErrors.Forbidden('Forbidden') }]
])('errorHandler (%s)', ({ error }, cb) => {
  expect.assertions(4)

  const send = jest.fn(function(arg) {
    expect(this.status.mock.calls.length).toBe(1)
    expect(this.send.mock.calls.length).toBe(1)

    expect(this.status.mock.calls[0][0]).toEqual(error.status)
    expect(arg).toEqual(error.toResponse())
    ;(cb as any)()
  })

  const res = { status: jest.fn().mockReturnThis(), send }

  errorHandler(error, {}, (res as any) as Response, jest.fn())
})

test('checkLogin (success)', cb => {
  expect.assertions(1)

  const req = { headers: { 'x-user-id': 'aaa' } }

  const next = jest.fn(() => {
    expect('called').toEqual('called')
    cb()
  })

  checkLogin((req as any) as Request, {} as Response, next)
})

test.each([[null], [undefined], ['']])(
  'checkLogin send 401 (%s)',
  (userId, cb) => {
    expect.assertions(4)

    const req = { headers: { 'x-user-id': userId } }

    const send = jest.fn(function(arg) {
      expect(this.status.mock.calls.length).toBe(1)
      expect(this.send.mock.calls.length).toBe(1)

      expect(this.status.mock.calls[0][0]).toEqual(401)
      expect(arg).toEqual('not login')
      ;(cb as any)()
    })

    const res = { status: jest.fn().mockReturnThis(), send }

    checkLogin((req as any) as Request, (res as any) as Response, jest.fn())
  }
)

test('init', async () => {
  await init()

  const general = await db.collections.rooms
    .find({ name: GENERAL_ROOM_NAME })
    .toArray()

  expect(general.length).toStrictEqual(1)
  expect(general[0].name).toStrictEqual(GENERAL_ROOM_NAME)
})

test('init twice', async () => {
  await init()
  await init()

  const general = await db.collections.rooms
    .find({ name: GENERAL_ROOM_NAME })
    .toArray()

  expect(general.length).toStrictEqual(1)
})
