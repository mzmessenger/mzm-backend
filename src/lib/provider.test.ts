jest.mock('./logger')
jest.mock('./redis', () => ({ xadd: jest.fn() }))
import redis from './redis'
import { getMockType } from '../../jest/testUtil'

const xadd = getMockType(redis.xadd)

import { SendMessage } from '../types'
import { addQueueToUser } from './provider'

test('addQueueToUser ', async () => {
  xadd.mockClear()

  const user = '5cc9d148139370d11b706624'

  const queue: SendMessage = {
    user: user,
    cmd: 'rooms',
    rooms: []
  }

  await addQueueToUser(user, queue)

  expect(xadd.mock.calls.length).toBe(1)

  const [, , , queueStr] = xadd.mock.calls[0]
  expect(queueStr).toEqual(JSON.stringify(queue))
})
