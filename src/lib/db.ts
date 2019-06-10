import { MongoClient, Collection, ObjectId } from 'mongodb'
import { MONGODB_URI } from '../config'
import logger from './logger'

export const collections: {
  rooms: Collection<Room>
  enter: Collection<Enter>
  users: Collection<User>
  removed: Collection<Removed>
  messages: Collection<Message>
} = {
  rooms: null,
  enter: null,
  users: null,
  messages: null,
  removed: null
}

export enum COLLECTION_NAMES {
  ROOMS = 'rooms',
  USERS = 'users',
  ENTER = 'enter',
  MESSAGES = 'messages',
  REMOVED = 'removed'
}

let connected = null

export async function connect() {
  if (connected) {
    return connected
  }

  const client = await MongoClient.connect(MONGODB_URI, {
    useNewUrlParser: true
  })

  const db = client.db('mzm')
  collections.rooms = db.collection<Room>(COLLECTION_NAMES.ROOMS)
  collections.enter = db.collection<Enter>(COLLECTION_NAMES.ENTER)
  collections.users = db.collection<User>(COLLECTION_NAMES.USERS)
  collections.messages = db.collection<Message>(COLLECTION_NAMES.MESSAGES)
  collections.removed = db.collection<Removed>(COLLECTION_NAMES.REMOVED)

  logger.info('[db] connected mongodb')

  connected = client

  return client
}

export type Room = {
  _id?: ObjectId
  name: string
  createdBy: string
}

export type Enter = {
  _id?: ObjectId
  roomId: ObjectId
  userId: ObjectId
}

export type User = {
  _id: ObjectId
  account: string
}

export type Removed = User & {
  originId: ObjectId
}

export type Message = {
  _id?: ObjectId
  message: string
  roomId: ObjectId
  userId: ObjectId
  createdAt: Date
}
