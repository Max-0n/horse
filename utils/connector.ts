import type { ConnectorResponse } from '@/types'

const FAST_SYNC_INTERVAL_SEC = 5 * 60
const FREQ_FAST_SYNC_INTERVAL_SEC = 5

export type SyncParams = {
  referrerId?: string
  partnerReferrer?: string
}

enum RequestType {
  Command = '/season2/command',
  CommandBatch = '/season2/command-batch',
  Sync = '/season2/sync',
  FastSync = '/season2/fast-sync',
}

type RequestOptions = {
  body?: string
}

class RequestPromise {
  private readonly promise: Promise<ConnectorResponse>
  private resolveInternal: ((value: ConnectorResponse | PromiseLike<ConnectorResponse>) => void) | null = null
  private rejectInternal: ((error: unknown) => void) | null = null

  constructor(
    private readonly type: RequestType,
    private readonly options?: RequestOptions
  ) {
    this.promise = new Promise<ConnectorResponse>((resolve, reject) => {
      this.resolveInternal = resolve
      this.rejectInternal = reject
    })
  }

  resolve(payload: ConnectorResponse): void {
    if (this.resolveInternal) this.resolveInternal(payload)
  }

  reject(error: unknown): void {
    if (this.rejectInternal) this.rejectInternal(error)
  }

  getType(): RequestType {
    return this.type
  }

  getOptions(): RequestOptions | undefined {
    return this.options
  }

  getPromise(): Promise<ConnectorResponse> {
    return this.promise
  }
}

class Connector {
  private app: any | null = null
  public featureFlags = {
    referrals: false,
    payer: false,
    allowDesktop: false,
  }
  private nextUpdateTime = 0
  private lastUpdateTime = 0
  private activeRequests = 0
  private requests: RequestPromise[] = []

  private onResponse(context: { response: any }) {
    if (!context.response.ok) return
    // this.lastUpdateTime = useConfigStore().getServerTime();
    const nextUpdateServerTime = new Date(context.response.headers.get('season2-state-next-update')).getTime()
    if (Number.isNaN(nextUpdateServerTime)) {
      this.nextUpdateTime = 0
    } else {
      this.nextUpdateTime = nextUpdateServerTime
    }
  }

  private fixDates(): void {
    if (!this.app) return

    this.app.lastUpdated = new Date(this.app.lastUpdated)
    if (this.app.lastActionDate) {
      this.app.lastActionDate = new Date(this.app.lastActionDate)
    }
    this.app.dailyCipherLastClaimed = new Date(this.app.dailyCipherLastClaimed)
    this.app.dailyComboLastClaimed = new Date(this.app.dailyComboLastClaimed)
    this.app.dailyComboLastAddedCard = new Date(this.app.dailyComboLastAddedCard)
    if (this.app.game) this.app.game.startDate = new Date(this.app.game.startDate)
    if (this.app.team.outOfOfficeDate) this.app.team.outOfOfficeDate = new Date(this.app.team.outOfOfficeDate)
  }

  getState(): any {
    if (!this.app) throw new Error('AppData not initialized')
    return this.app
  }

  getFeatureFlags(): any {
    if (!this.featureFlags) throw new Error('FeatureFlags not initialized')
    return this.featureFlags
  }

  private sendNextRequest() {
    if (this.activeRequests) return
    if (this.requests.length === 0) return
    this.activeRequests += 1
    const request = this.requests.shift()
    if (!request) {
      this.activeRequests -= 1
      return
    }

    this.postRequest(request)
      .then((response: ConnectorResponse) => {
        if (response.user) {
          this.app = response.user
          this.fixDates()
        }
        if (response.featureFlags) this.featureFlags = response.featureFlags
        request.resolve(response)
      })
      .catch(error => {
        request.reject(error)
      })
      .finally(() => {
        this.activeRequests -= 1
        this.sendNextRequest()
      })
  }

  private postRequest(request: RequestPromise): Promise<ConnectorResponse> {
    const type = request.getType()
    const options = request.getOptions()

    return $api.post(type.toString(), options, {
      onResponse: this.onResponse.bind(this),
    })
  }

  sendRequest(type: RequestType, options?: any) {
    const current = new RequestPromise(type, options)
    this.requests.push(current)

    this.sendNextRequest()
    return current.getPromise()
  }

  sendCommand(command: any): Promise<ConnectorResponse> {
    if (!this.app) throw new Error('AppData not initialized')

    return this.sendRequest(RequestType.Command, {
      body: JSON.stringify({ command: command }),
    })
  }

  sendCommandBatch(commands: any[]): Promise<ConnectorResponse> {
    if (!this.app) throw new Error('AppData not initialized')

    return this.sendRequest(RequestType.CommandBatch, {
      body: JSON.stringify({ commands: commands }),
    })
  }

  sync(params?: SyncParams): Promise<ConnectorResponse> {
    // const authStore = useAuthStore();
    const token = 'authStore.token'
    if (!token) throw new Error('Call sync before login')

    return this.sendRequest(RequestType.Sync, {
      body: JSON.stringify(params || {}),
    })
  }

  fastSync(): Promise<ConnectorResponse> {
    if (!this.app) throw new Error('AppData not initialized')

    return this.sendRequest(RequestType.FastSync, {})
  }

  resetAccount(): Promise<ConnectorResponse> {
    return $api.post('/season2/delete-me', {}).then(() => {
      return this.sync()
    })
  }

  hasActiveRequests(): boolean {
    return this.activeRequests > 0
  }

  poll(frequent?: boolean): Promise<ConnectorResponse> | Promise<void> {
    if (!this.app) throw new Error('AppData not initialized')

    // const serverTime = useConfigStore().getServerTime();
    // if (
    // 	frequent &&
    // 	this.lastUpdateTime &&
    // 	serverTime >=
    // 		this.lastUpdateTime +
    // 			(frequent ? FREQ_FAST_SYNC_INTERVAL_SEC : FAST_SYNC_INTERVAL_SEC)
    // )
    // 	return this.fastSync();
    // if (this.nextUpdateTime && serverTime >= this.nextUpdateTime)
    // 	return this.fastSync();

    return Promise.resolve()
  }
}

export default Connector
