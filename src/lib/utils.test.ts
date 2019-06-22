import { popParam } from './utils'

test.each([
  [null, ''],
  [undefined, ''],
  ['', ''],
  [' ', ''],
  ['　', ''],
  ['　 　', ''],
  ['aaa', 'aaa'],
  ['  aaaa', 'aaaa'],
  ['&aa%><', '&amp;aa%&gt;&lt;']
])('popParam (%s)', (arg, answer) => {
  const pop = popParam(arg)
  expect(pop).toStrictEqual(answer)
})
