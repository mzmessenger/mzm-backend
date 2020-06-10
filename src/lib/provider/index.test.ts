jest.mock('./logger')
jest.mock('./redis', () => {
  return {
    client: {
      xadd: jest.fn()
    }
  }
})
import { client } from '../redis'
import { getMockType } from '../../../jest/testUtil'

const xadd = getMockType(client.xadd)

import { SendMessage } from '../../types'
import { addQueueToUsers } from './index'

test('addQueueToUsers', async () => {
  xadd.mockClear()

  const users = ['5cc9d148139370d11b706624']

  const queue: SendMessage = {
    user: null,
    cmd: 'rooms',
    rooms: [],
    roomOrder: []
  }

  await addQueueToUsers(users, queue)

  expect(xadd.mock.calls.length).toBe(1)

  const [, , , , , queueStr] = xadd.mock.calls[0]
  expect(queueStr).toEqual(JSON.stringify({ ...queue, user: users[0] }))
})
