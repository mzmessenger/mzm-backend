import { MongoClient, Collection, ObjectId } from 'mongodb'
import { MONGODB_URI } from '../config'
import logger from './logger'

export const collections: {
  rooms: Collection<Room>
  enter: Collection<Enter>
  users: Collection<User>
  messages: Collection<Message>
} = {
  rooms: null,
  enter: null,
  users: null,
  messages: null
}

export enum COLLECTION_NAMES {
  ROOMS = 'rooms',
  USERS = 'users',
  ENTER = 'enter'
}

export async function connect() {
  const client = await MongoClient.connect(MONGODB_URI, {
    useNewUrlParser: true
  })

  const db = client.db('mzm')
  collections.rooms = db.collection(COLLECTION_NAMES.ROOMS)
  collections.enter = db.collection(COLLECTION_NAMES.ENTER)
  collections.users = db.collection(COLLECTION_NAMES.USERS)
  collections.messages = db.collection('messages')

  logger.info('[db] connected mongodb')

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

export type Message = {
  _id?: ObjectId
  message: string
  roomId: ObjectId
  userId: ObjectId
  createdAt: Date
}
