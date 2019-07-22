import assert from 'assert'
import { MongoClient } from 'mongodb'
import { MongoMemoryServer } from 'mongodb-memory-server'

export function getMockType(arg) {
  return <jest.Mock<typeof arg>>arg
}

export async function mongoSetup() {
  const mongoServer = new MongoMemoryServer()
  const uri = await mongoServer.getConnectionString()
  return { uri, mongoServer }
}

export async function getDbConnection(uri: string) {
  assert.strictEqual(process.env.NODE_ENV, 'test')

  const client = await MongoClient.connect(uri, {
    useNewUrlParser: true
  })

  return client
}

export async function dropCollection(uri: string, name: string) {
  const client = await getDbConnection(uri)
  const db = client.db('mzm')

  const collections = (await db.collections()).map(c => c.collectionName)
  if (!collections.includes(name)) {
    return Promise.resolve()
  }
  return await db.collection(name).drop()
}
