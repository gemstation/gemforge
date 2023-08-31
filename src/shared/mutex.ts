type Resolver = () => void

export class Mutex {
  private _lock?: Promise<void>
  private _unlock?: Resolver

  async lock (): Promise<void> {
    if (this._lock) {
      await this._lock
    }

    this._lock = new Promise<void>((resolve) => {
      this._unlock = resolve
    })
  }

  async unlock (): Promise<void> {
    if (!this._lock) {
      throw new Error('Mutex is not locked')
    }
    this._unlock!()
    delete this._lock;
  }
}