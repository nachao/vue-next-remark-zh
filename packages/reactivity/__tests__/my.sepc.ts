import { reactive } from '../src/reactive'
// import { isReactive } from '../src/reactive'
// import { mockWarn } from '@vue/runtime-test'

describe('reactivity/reactive', () => {
  //   mockWarn()

  test('Object', () => {
    const original = { first: { foo: 1 }, two: { foo: 2 } }

    const observed = reactive(original.first)
    // Reflect.deleteProperty(original, 'first')

    reactive(original.two)

    console.log(observed)

    // expect(observed).not.toBe(original)
    // expect(isReactive(observed)).toBe(true)
    // expect(isReactive(original)).toBe(false)
    // // get
    // expect(observed.foo).toBe(1)
    // // has
    // expect('foo' in observed).toBe(true)
    // // ownKeys
    // expect(Object.keys(observed)).toEqual(['foo'])
  })
})
