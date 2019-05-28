jest.mock('../lib/logger')
jest.mock('../lib/db', () => {
  return {
    collections: { rooms: { updateOne: jest.fn() } }
  }
})

import { Request, Response } from 'express'

import { errorHandler, checkLogin, init } from './server'
import * as HttpErrors from '../lib/errors'
import * as db from '../lib/db'
import { GENERAL_ROOM_NAME } from '../config'
import { getMockType } from '../testUtil'

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
  const updateOne = getMockType(db.collections.rooms.updateOne)
  updateOne.mockClear()
  updateOne.mockResolvedValue('')

  await init()

  // サーバ起動時に general 部屋を作成している
  expect(updateOne.mock.calls.length).toBe(1)
  const [filter, set, option] = updateOne.mock.calls[0]
  expect(filter).toMatchObject({ name: GENERAL_ROOM_NAME })
  expect(set['$set'].name).toStrictEqual(GENERAL_ROOM_NAME)
  expect(option.upsert).toStrictEqual(true)
})
