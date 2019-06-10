export default async function() {
  await (global as any).MONGO_MEMORY_SERVER.stop()
}
