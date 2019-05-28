export function getMockType(arg) {
  return <jest.Mock<typeof arg>>arg
}
