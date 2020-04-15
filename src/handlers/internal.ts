import { Request } from 'express'
import { getRooms } from '../logic/users'
import { SendMessage } from '../types'
import {
  ReceiveMessage,
  sendMessage,
  iine,
  modifyMessage,
  getMessagesFromRoom,
  enterRoom,
  readMessage
} from './internal/socket'

export const socket = async (req: Request) => {
  const user: string = req.headers['x-user-id'] as string
  const data = req.body as ReceiveMessage
  if (data.cmd === 'message:send') {
    return await sendMessage(user, data)
  } else if (data.cmd === 'message:iine') {
    return await iine(user, data)
  } else if (data.cmd === 'message:modify') {
    return await modifyMessage(user, data)
  } else if (data.cmd === 'messages:room') {
    return await getMessagesFromRoom(user, data)
  } else if (data.cmd === 'rooms:get') {
    const rooms = await getRooms(user)
    const room: SendMessage = { user: user, cmd: 'rooms', rooms }
    return room
  } else if (data.cmd === 'rooms:enter') {
    return await enterRoom(user, data)
  } else if (data.cmd === 'rooms:read') {
    return await readMessage(user, data)
  }
  return
}
