jest.mock('./logger')
jest.mock('./redis', () => ({ xadd: jest.fn() }))
import redis from './redis'
import { getMockType } from '../../jest/testUtil'

const xadd = getMockType(redis.xadd)

import { SendMessage } from '../types'
import { addQueueToUsers } from './provider'

test('addQueueToUsers', async () => {
  xadd.mockClear()

  const users = ['5cc9d148139370d11b706624']

  const queue: SendMessage = {
    user: null,
    cmd: 'rooms',
    rooms: []
  }

  await addQueueToUsers(users, queue)

  expect(xadd.mock.calls.length).toBe(1)

  const [, , , , , queueStr] = xadd.mock.calls[0]
  expect(queueStr).toEqual(JSON.stringify({ ...queue, user: users[0] }))
})
