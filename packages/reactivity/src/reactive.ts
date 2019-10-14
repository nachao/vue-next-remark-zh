import { isObject, toTypeString } from '@vue/shared'

// Handler
import { mutableHandlers, readonlyHandlers } from './baseHandlers'

import {
  mutableCollectionHandlers,
  readonlyCollectionHandlers
} from './collectionHandlers'

import { UnwrapNestedRefs } from './ref'
import { ReactiveEffect } from './effect'

// The main WeakMap that stores {target -> key -> dep} connections.
// Conceptually, it's easier to think of a dependency as a Dep class
// which maintains a Set of subscribers, but we simply store them as
// raw Sets to reduce memory overhead.
// ?
export type Dep = Set<ReactiveEffect>
export type KeyToDepMap = Map<string | symbol, Dep>
export const targetMap = new WeakMap<any, KeyToDepMap>()

// WeakMaps that store {raw <-> observed} pairs.
const rawToReactive = new WeakMap<any, any>()
const reactiveToRaw = new WeakMap<any, any>()
const rawToReadonly = new WeakMap<any, any>()
const readonlyToRaw = new WeakMap<any, any>()

// WeakSets for values that are marked readonly or non-reactive during
// observable creation.
const readonlyValues = new WeakSet<any>()
const nonReactiveValues = new WeakSet<any>()

const collectionTypes = new Set<Function>([Set, Map, WeakMap, WeakSet])
const observableValueRE = /^\[object (?:Object|Array|Map|Set|WeakMap|WeakSet)\]$/

// 监听数据的前提是：
// 1. 非 Vue 的实例对象；
// 2. 非 VNode 的实例对象；
// 3. 非指定不监听的数据；
// 4. 仅允许 Object|Array|Map|Set|WeakMap|WeakSet 这些类型的数据；
const canObserve = (value: any): boolean => {
  return (
    !value._isVue &&
    !value._isVNode &&
    observableValueRE.test(toTypeString(value)) &&
    !nonReactiveValues.has(value)
  )
}

export function reactive<T extends object>(target: T): UnwrapNestedRefs<T>
export function reactive(target: object) {
  // if trying to observe a readonly proxy, return the readonly version.
  if (readonlyToRaw.has(target)) {
    return target
  }
  // target is explicitly marked as readonly by user
  if (readonlyValues.has(target)) {
    return readonly(target)
  }
  return createReactiveObject(
    target,
    rawToReactive,
    reactiveToRaw,
    mutableHandlers,
    mutableCollectionHandlers
  )
}

export function readonly<T extends object>(
  target: T
): Readonly<UnwrapNestedRefs<T>>
export function readonly(target: object) {
  // value is a mutable observable, retrieve its original and return
  // a readonly version.
  if (reactiveToRaw.has(target)) {
    target = reactiveToRaw.get(target)
  }
  return createReactiveObject(
    target,
    rawToReadonly,
    readonlyToRaw,
    readonlyHandlers,
    readonlyCollectionHandlers
  )
}

function createReactiveObject(
  target: any,
  toProxy: WeakMap<any, any>,
  toRaw: WeakMap<any, any>,
  baseHandlers: ProxyHandler<any>,
  collectionHandlers: ProxyHandler<any>
) {
  // 仅监听对象数据，否则返回数据本身
  // 调试模式中输出报错
  if (!isObject(target)) {
    if (__DEV__) {
      console.warn(`value cannot be made reactive: ${String(target)}`)
    }
    return target
  }
  // target already has corresponding Proxy
  // 如果源数据监听过，（虽然 Map 本身也会绑定失败）
  // 则直接返回 Proxy 处理过的数据
  let observed = toProxy.get(target)
  if (observed !== void 0) {
    return observed
  }
  // target is already a Proxy
  // 如果监听数据是 Proxy 处理后的数据，
  // 则直接返回
  if (toRaw.has(target)) {
    return target
  }
  // only a whitelist of value types can be observed.
  // 源数据是否允许设置 Proxy 代理
  // 详细见定义处
  if (!canObserve(target)) {
    return target
  }

  // Set, Map, WeakMap, WeakSet 类数据
  // 与 Object, Array 区分定义代理操作
  const handlers = collectionTypes.has(target.constructor)
    ? collectionHandlers
    : baseHandlers
  observed = new Proxy(target, handlers)
  // 分别将 “代理前” 与 “代理后” 的数据
  // 以它们为 Key 存储在两个 WeakMap 中
  // 为了更快速查询是否重复监听数据
  toProxy.set(target, observed)
  toRaw.set(observed, target)
  // 跟踪数据设置？
  if (!targetMap.has(target)) {
    targetMap.set(target, new Map())
  }
  return observed
}

export function isReactive(value: any): boolean {
  return reactiveToRaw.has(value) || readonlyToRaw.has(value)
}

export function isReadonly(value: any): boolean {
  return readonlyToRaw.has(value)
}

export function toRaw<T>(observed: T): T {
  return reactiveToRaw.get(observed) || readonlyToRaw.get(observed) || observed
}

export function markReadonly<T>(value: T): T {
  readonlyValues.add(value)
  return value
}

export function markNonReactive<T>(value: T): T {
  nonReactiveValues.add(value)
  return value
}
