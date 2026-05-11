import { ref, unref, type Ref } from "vue"

export interface RestClientOptions {
  baseUrl?: string
  headers?: Record<string, string>
}

export interface RequestOptions<TBody> {
  params?: Record<string, string | number | boolean>
  body?: TBody
  headers?: Record<string, string>
  signal?: AbortSignal
}

export interface RestResponse<T> {
  data: T | undefined
  status: number
  ok: boolean
  raw: Response | undefined
}

export type RequestInterceptor = (input: {
  method: string
  path: string
  options: RequestOptions<any>
}) =>
  | Promise<{
      method: string
      path: string
      options: RequestOptions<any>
    }>
  | {
      method: string
      path: string
      options: RequestOptions<any>
    }

export type ResponseInterceptor<T = any> = (
  response: RestResponse<T>,
) => Promise<RestResponse<T>> | RestResponse<T>

export function useRestClient(options: RestClientOptions = {}) {
  const loading = ref(false)
  const error = ref<unknown>(undefined)

  const requestInterceptors: RequestInterceptor[] = []
  const responseInterceptors: ResponseInterceptor[] = []

  const addRequestInterceptor = (fn: RequestInterceptor) => {
    requestInterceptors.push(fn)
  }

  const addResponseInterceptor = (fn: ResponseInterceptor) => {
    responseInterceptors.push(fn)
  }

  const resolveUrl = (baseUrl: string | undefined, path: string): URL | undefined => {
    try {
      return new URL(path, baseUrl)
    } catch (_err) {
      try {
        return new URL(`${baseUrl}${path}`, window.location.origin)
      } catch (_err) {
        return new URL(path)
      }
    }
    return undefined
  }

  const buildUrl = (path: string, params?: Record<string, string | number | boolean>) => {
    const base = options.baseUrl ?? ""
    const url = resolveUrl(base, path)

    if (!url) return ""

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value))
      }
    }

    return url.toString()
  }

  const applyRequestInterceptors = async (
    method: string,
    path: string,
    opts: RequestOptions<any>,
  ) => {
    let state = { method, path, options: opts }

    for (const interceptor of requestInterceptors) {
      state = await interceptor(state)
    }

    return state
  }

  const applyResponseInterceptors = async <T>(response: RestResponse<T>) => {
    let state = response

    for (const interceptor of responseInterceptors) {
      state = await interceptor(state)
    }

    return state
  }

  const request = async <TResponse, TBody = unknown>(
    method: string,
    path: string | Ref<string>,
    opts: RequestOptions<TBody> = {},
  ): Promise<RestResponse<TResponse>> => {
    const resolvedPath = unref(path)

    const intercepted = await applyRequestInterceptors(method, resolvedPath, opts)

    const url = buildUrl(intercepted.path, intercepted.options.params)
    if (!url) {
      const badUrlFailure: RestResponse<TResponse> = {
        data: undefined,
        status: 400,
        ok: false,
        raw: undefined,
      }
      return badUrlFailure
    }

    loading.value = true
    error.value = undefined

    try {
      const res = await fetch(url, {
        method: intercepted.method,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers ?? {}),
          ...(intercepted.options.headers ?? {}),
        },
        body: intercepted.options.body ? JSON.stringify(intercepted.options.body) : undefined,
        signal: intercepted.options.signal,
      })

      const json = (await res.json().catch(() => undefined)) as TResponse | undefined

      const baseResponse: RestResponse<TResponse> = {
        data: json,
        status: res.status,
        ok: res.ok,
        raw: res,
      }

      return await applyResponseInterceptors(baseResponse)
    } catch (err) {
      error.value = err

      const failure: RestResponse<TResponse> = {
        data: undefined,
        status: 0,
        ok: false,
        raw: undefined,
      }

      return await applyResponseInterceptors(failure)
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,

    addRequestInterceptor,
    addResponseInterceptor,

    get: <T>(path: string | Ref<string>, opts?: RequestOptions<never>) =>
      request<T>("GET", path, opts),

    post: <T, B>(path: string | Ref<string>, body?: B, opts?: RequestOptions<B>) =>
      request<T, B>("POST", path, { ...opts, body }),

    put: <T, B>(path: string | Ref<string>, body?: B, opts?: RequestOptions<B>) =>
      request<T, B>("PUT", path, { ...opts, body }),

    patch: <T, B>(path: string | Ref<string>, body?: B, opts?: RequestOptions<B>) =>
      request<T, B>("PATCH", path, { ...opts, body }),

    delete: <T>(path: string | Ref<string>, opts?: RequestOptions<never>) =>
      request<T>("DELETE", path, opts),
  }
}
