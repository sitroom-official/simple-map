import { options } from './preact.js'

/** @type {number} */

var currentIndex
/** @type {import('./internal').Component} */

var currentComponent
/** @type {number} */

var currentHook = 0
/** @type {Array<import('./internal').Component>} */

var afterPaintEffects = []
var oldBeforeRender = options._render
var oldAfterDiff = options.diffed
var oldCommit = options._commit
var oldBeforeUnmount = options.unmount
var RAF_TIMEOUT = 100
var prevRaf

options._render = function (vnode) {
    if (oldBeforeRender) {
        oldBeforeRender(vnode)
    }
    currentComponent = vnode._component
    currentIndex = 0

    if (currentComponent.__hooks) {
        currentComponent.__hooks._pendingEffects.forEach(invokeCleanup)

        currentComponent.__hooks._pendingEffects.forEach(invokeEffect)

        currentComponent.__hooks._pendingEffects = []
    }
}

options.diffed = function (vnode) {
    if (oldAfterDiff) {
        oldAfterDiff(vnode)
    }
    var c = vnode._component
    if (!c) {
        return
    }
    var hooks = c.__hooks

    if (hooks) {
        if (hooks._pendingEffects.length) {
            afterPaint(afterPaintEffects.push(c))
        }
    }
}

options._commit = function (vnode, commitQueue) {
    commitQueue.some(function (component) {
        try {
            component._renderCallbacks.forEach(invokeCleanup)

            component._renderCallbacks = component._renderCallbacks.filter(
                function (cb) {
                    return cb._value ? invokeEffect(cb) : true
                }
            )
        } catch (e) {
            commitQueue.some(function (c) {
                if (c._renderCallbacks) {
                    c._renderCallbacks = []
                }
            })
            commitQueue = []

            options._catchError(e, component._vnode)
        }
    })
    if (oldCommit) {
        oldCommit(vnode, commitQueue)
    }
}

options.unmount = function (vnode) {
    if (oldBeforeUnmount) {
        oldBeforeUnmount(vnode)
    }
    var c = vnode._component
    if (!c) {
        return
    }
    var hooks = c.__hooks

    if (hooks) {
        try {
            hooks._list.forEach(function (hook) {
                return hook._cleanup && hook._cleanup()
            })
        } catch (e) {
            options._catchError(e, c._vnode)
        }
    }
}
/**
 * Get a hook's state from the currentComponent
 * @param {number} index The index of the hook to get
 * @param {number} type The index of the hook to get
 * @returns {import('./internal').HookState}
 */

function getHookState(index, type) {
    if (options._hook) {
        options._hook(currentComponent, index, currentHook || type)
    }

    currentHook = 0 // Largely inspired by:
    // * https://github.com/michael-klein/funcy.js/blob/f6be73468e6ec46b0ff5aa3cc4c9baf72a29025a/src/hooks/core_hooks.mjs
    // * https://github.com/michael-klein/funcy.js/blob/650beaa58c43c33a74820a3c98b3c7079cf2e333/src/renderer.mjs
    // Other implementations to look at:
    // * https://codesandbox.io/s/mnox05qp8

    var hooks =
        currentComponent.__hooks ||
        (currentComponent.__hooks = {
            _list: [],
            _pendingEffects: [],
        })

    if (index >= hooks._list.length) {
        hooks._list.push({})
    }

    return hooks._list[index]
}
/**
 * @param {import('./index').StateUpdater<any>} initialState
 */

function useState(initialState) {
    currentHook = 1
    return useReducer(invokeOrReturn, initialState)
}
/**
 * @param {import('./index').Reducer<any, any>} reducer
 * @param {import('./index').StateUpdater<any>} initialState
 * @param {(initialState: any) => void} [init]
 * @returns {[ any, (state: any) => void ]}
 */

function useReducer(reducer, initialState, init) {
    /** @type {import('./internal').ReducerHookState} */
    var hookState = getHookState(currentIndex++, 2)

    if (!hookState._component) {
        hookState._component = currentComponent
        hookState._value = [
            !init
                ? invokeOrReturn(undefined, initialState)
                : init(initialState),
            function (action) {
                var nextValue = reducer(hookState._value[0], action)

                if (hookState._value[0] !== nextValue) {
                    hookState._value[0] = nextValue

                    hookState._component.setState({})
                }
            },
        ]
    }

    return hookState._value
}
/**
 * @param {import('./internal').Effect} callback
 * @param {any[]} args
 */

function useEffect(callback, args) {
    /** @type {import('./internal').EffectHookState} */
    var state = getHookState(currentIndex++, 3)

    if (!options._skipEffects && argsChanged(state._args, args)) {
        state._value = callback
        state._args = args

        currentComponent.__hooks._pendingEffects.push(state)
    }
}
/**
 * @param {import('./internal').Effect} callback
 * @param {any[]} args
 */

function useLayoutEffect(callback, args) {
    /** @type {import('./internal').EffectHookState} */
    var state = getHookState(currentIndex++, 4)

    if (!options._skipEffects && argsChanged(state._args, args)) {
        state._value = callback
        state._args = args

        currentComponent._renderCallbacks.push(state)
    }
}
function useRef(initialValue) {
    currentHook = 5
    return useMemo(function () {
        return {
            current: initialValue,
        }
    }, [])
}
/**
 * @param {object} ref
 * @param {() => object} createHandle
 * @param {any[]} args
 */

function useImperativeHandle(ref, createHandle, args) {
    currentHook = 6
    useLayoutEffect(
        function () {
            if (typeof ref == 'function') {
                ref(createHandle())
            } else if (ref) {
                ref.current = createHandle()
            }
        },
        args == null ? args : args.concat(ref)
    )
}
/**
 * @param {() => any} factory
 * @param {any[]} args
 */

function useMemo(factory, args) {
    /** @type {import('./internal').MemoHookState} */
    var state = getHookState(currentIndex++, 7)

    if (argsChanged(state._args, args)) {
        state._args = args
        state._factory = factory
        return (state._value = factory())
    }

    return state._value
}
/**
 * @param {() => void} callback
 * @param {any[]} args
 */

function useCallback(callback, args) {
    currentHook = 8
    return useMemo(function () {
        return callback
    }, args)
}
/**
 * @param {import('./internal').PreactContext} context
 */

function useContext(context) {
    var provider = currentComponent.context[context._id] // We could skip this call here, but than we'd not call
    // `options._hook`. We need to do that in order to make
    // the devtools aware of this hook.

    var state = getHookState(currentIndex++, 9) // The devtools needs access to the context object to
    // be able to pull of the default value when no provider
    // is present in the tree.

    state._context = context
    if (!provider) {
        return context._defaultValue
    } // This is probably not safe to convert to "!"

    if (state._value == null) {
        state._value = true
        provider.sub(currentComponent)
    }

    return provider.props.value
}
/**
 * Display a custom label for a custom hook for the devtools panel
 * @type {<T>(value: T, cb?: (value: T) => string | number) => void}
 */

function useDebugValue(value, formatter) {
    if (options.useDebugValue) {
        options.useDebugValue(formatter ? formatter(value) : value)
    }
}
function useErrorBoundary(cb) {
    var state = getHookState(currentIndex++, 10)
    var errState = useState()
    state._value = cb

    if (!currentComponent.componentDidCatch) {
        currentComponent.componentDidCatch = function (err) {
            if (state._value) {
                state._value(err)
            }
            errState[1](err)
        }
    }

    return [
        errState[0],
        function () {
            errState[1](undefined)
        },
    ]
}
/**
 * After paint effects consumer.
 */

function flushAfterPaintEffects() {
    afterPaintEffects.some(function (component) {
        if (component._parentDom) {
            try {
                component.__hooks._pendingEffects.forEach(invokeCleanup)

                component.__hooks._pendingEffects.forEach(invokeEffect)

                component.__hooks._pendingEffects = []
            } catch (e) {
                component.__hooks._pendingEffects = []

                options._catchError(e, component._vnode)

                return true
            }
        }
    })
    afterPaintEffects = []
}
/**
 * Schedule a callback to be invoked after the browser has a chance to paint a new frame.
 * Do this by combining requestAnimationFrame (rAF) + setTimeout to invoke a callback after
 * the next browser frame.
 *
 * Also, schedule a timeout in parallel to the the rAF to ensure the callback is invoked
 * even if RAF doesn't fire (for example if the browser tab is not visible)
 *
 * @param {() => void} callback
 */

function afterNextFrame(callback) {
    var done = function done() {
        clearTimeout(timeout)
        cancelAnimationFrame(raf)
        setTimeout(callback)
    }

    var timeout = setTimeout(done, RAF_TIMEOUT)
    var raf

    if (typeof window != 'undefined') {
        raf = requestAnimationFrame(done)
    }
} // Note: if someone used options.debounceRendering = requestAnimationFrame,
// then effects will ALWAYS run on the NEXT frame instead of the current one, incurring a ~16ms delay.
// Perhaps this is not such a big deal.

/**
 * Schedule afterPaintEffects flush after the browser paints
 * @param {number} newQueueLength
 */

function afterPaint(newQueueLength) {
    if (newQueueLength === 1 || prevRaf !== options.requestAnimationFrame) {
        prevRaf = options.requestAnimationFrame
        ;(prevRaf || afterNextFrame)(flushAfterPaintEffects)
    }
}
/**
 * @param {import('./internal').EffectHookState} hook
 */

function invokeCleanup(hook) {
    if (hook._cleanup) {
        hook._cleanup()
    }
}
/**
 * Invoke a Hook's effect
 * @param {import('./internal').EffectHookState} hook
 */

function invokeEffect(hook) {
    var result = hook._value()

    if (typeof result == 'function') {
        hook._cleanup = result
    }
}
/**
 * @param {any[]} oldArgs
 * @param {any[]} newArgs
 */

function argsChanged(oldArgs, newArgs) {
    return (
        !oldArgs ||
        newArgs.some(function (arg, index) {
            return arg !== oldArgs[index]
        })
    )
}

function invokeOrReturn(arg, f) {
    return typeof f == 'function' ? f(arg) : f
}

export {
    useState,
    useReducer,
    useEffect,
    useLayoutEffect,
    useRef,
    useImperativeHandle,
    useMemo,
    useCallback,
    useContext,
    useDebugValue,
    useErrorBoundary,
}
