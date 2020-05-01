import { Request } from 'express'
import {
  ReceiveMessageCmd,
  ReceiveMessage,
  sendMessage,
  iine,
  modifyMessage,
  getMessagesFromRoom,
  enterRoom,
  readMessage,
  sortRooms,
  getRooms
} from './internal/socket'

export const socket = async (req: Request) => {
  const user: string = req.headers['x-user-id'] as string
  const data = req.body as ReceiveMessage
  if (data.cmd === ReceiveMessageCmd.MESSAGE_SEND) {
    return await sendMessage(user, data)
  } else if (data.cmd === ReceiveMessageCmd.MESSAGE_IINE) {
    return await iine(user, data)
  } else if (data.cmd === ReceiveMessageCmd.MESSAGE_MODIFY) {
    return await modifyMessage(user, data)
  } else if (data.cmd === ReceiveMessageCmd.MESSAGES_ROOM) {
    return await getMessagesFromRoom(user, data)
  } else if (data.cmd === ReceiveMessageCmd.ROOMS_GET) {
    return await getRooms(user)
  } else if (data.cmd === ReceiveMessageCmd.ROOMS_ENTER) {
    return await enterRoom(user, data)
  } else if (data.cmd === ReceiveMessageCmd.ROOMS_READ) {
    return await readMessage(user, data)
  } else if (data.cmd === ReceiveMessageCmd.ROOMS_SORT) {
    return await sortRooms(user, data)
  }
  return
}
