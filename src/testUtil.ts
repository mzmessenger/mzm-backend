import assert from 'assert'
import { MongoClient } from 'mongodb'
import { MONGODB_URI } from './config'

export function getMockType(arg) {
  return <jest.Mock<typeof arg>>arg
}

let db = null

export async function getDbConnection() {
  assert.strictEqual(process.env.NODE_ENV, 'test')

  if (db) {
    return db
  }

  const connection = await MongoClient.connect(MONGODB_URI, {
    useNewUrlParser: true
  })

  db = connection

  return connection
}

export async function initDb() {
  const client = await getDbConnection()

  const db = client.db('mzm')
  const collections = await db.collections()
  const promises = collections.map(collection => {
    return collection.drop()
  })
  return await Promise.all(promises)
}

export async function dropCollection(name: string) {
  const client = await getDbConnection()
  const db = client.db('mzm')

  const collections = (await db.collections()).map(c => c.collectionName)
  if (!collections.includes(name)) {
    return Promise.resolve()
  }
  return await db.collection(name).drop()
}
