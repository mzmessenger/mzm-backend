import Redis from 'ioredis'
import * as config from '../config'

export const connect = async () => {
  client = new Redis(config.redis.options)
}

export let client: Redis.Redis = null
