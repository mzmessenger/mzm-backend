import { config } from 'dotenv'
config()

export const { MONGODB_URI } = process.env

export const API_LISTEN = 3001

export const WORKER_NUM = 2

export const GENERAL_ROOM_NAME = 'general'

export const MESSAGE_LIMIT = 20
