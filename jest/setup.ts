import { MongoMemoryServer } from 'mongodb-memory-server'

export default async function() {
  const mongoServer = new MongoMemoryServer()
  const mongoUri = await mongoServer.getConnectionString()
  ;(global as any).MONGO_MEMORY_SERVER = mongoServer
  process.env.MONGODB_TEST_URI = mongoUri
}
