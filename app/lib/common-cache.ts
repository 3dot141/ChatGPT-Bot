// hybrid module, either works
import { BackgroundFetch, LRUCache } from "lru-cache";

// At least one of 'max', 'ttl', or 'maxSize' is required, to prevent
// unsafe unbounded storage.
//
// In most cases, it's best to specify a max for performance, so all
// the required memory allocation is done up-front.
//
// All the other options are optional, see the sections below for
// documentation on what each one does.  Most of them can be
// overridden for specific items in get()/set()
export const DEFAULT_OPTIONS = {
  max: 500,

  // how long to live in ms
  ttl: 1000 * 60 * 5,

  updateAgeOnGet: true,

  updateAgeOnHas: true,
};

export class CommonCache<
  K extends {},
  V extends {},
  FC = unknown,
> extends LRUCache<K, V, FC> {
  constructor(options?: LRUCache.Options<K, V, FC>) {
    super(options ?? DEFAULT_OPTIONS);
  }

  async getOrLoad(k: K, loadFunc?: () => Promise<V>): Promise<V | undefined> {
    let v = super.get(k);
    if (!v) {
      v = await loadFunc?.();
      v && super.set(k, v);
    }
    return v;
  }
}
