export type Room = {
  id: string
  name: string
}

export type Message = {
  id: string
  userId: string
  message: string
  createdAt: Date
  userAccount: string
}

export type SendMessage =
  | {
      user: string
      cmd: 'rooms'
      rooms: Room[]
    }
  | {
      user: string
      cmd: 'message:receive'
      message: Message
      room: string
    }
  | {
      user: string
      cmd: 'messages:room'
      messages: Message[]
      room: string
      existHistory: boolean
    }
  | {
      user: string
      cmd: 'rooms:enter:success'
      id: string
      name: string
    }
