import assert from 'assert'
import { MongoClient } from 'mongodb'

export function getMockType(arg) {
  return <jest.Mock<typeof arg>>arg
}

let connection: MongoClient = null

export async function getDbConnection() {
  assert.strictEqual(process.env.NODE_ENV, 'test')

  if (connection) {
    return connection
  }

  const client = await MongoClient.connect(process.env.MONGODB_TEST_URI, {
    useNewUrlParser: true
  })

  connection = client

  return client
}

export async function tearDown() {
  await connection.close()
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
