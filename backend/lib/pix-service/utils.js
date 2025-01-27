import { base64pad } from 'multiformats/bases/base64'

const encodeInBase64 = (data) => {
  return base64pad.baseEncode(data)
}

// A Cache for fast lookups of Miner IDs
// Follows the FIFO principal up to a certain max size. Deletes the entries which are used the least frequently.
/**
 * @param {number} maxSize
 * @template K - The type of the keys in the cache.
 * @template V - The type of the values in the cache.
 * @param {Map<K,V>} map
 * @param {Array} queue
 * @returns {Cache}
 */
class Cache {
  #maxSize
  #map
  #queue
  constructor (maxSize = 10000) {
    this.maxSize = maxSize
    this.map = new Map()
    this.queue = []
  }

  /**
   * Store a key-value pair in the cache. If the cache is full, remove least used entry.
   * @param {K} key
   * @param {V} value
   */
  set (key, value) {
    // If the key already exists, delete it to update its position in the queue
    if (this.map.has(key)) {
      this.#removeKeyFromQueue(key)
    }

    // If the cache is full, remove the oldest entry
    if (this.queue.length >= this.maxSize) {
      const oldestKey = this.queue.shift()
      this.map.delete(oldestKey)
    }

    this.queue.push(key)
    this.map.set(key, value)
  }

  /**
   * Get the value associated with the key. If the key is not found, return null.
   * @param {K} key
   * @returns {V | null}
  */
  get (key) {
    if (!this.map.has(key)) {
      return null // Key not found
    }

    this.#removeKeyFromQueue(key)
    this.queue.push(key)

    return this.map.get(key)
  }

  /**
   * Check if the key is present in the cache.
   * @param {K} key
   * @returns {boolean}
   */
  has (key) {
    return this.map.has(key)
  }

  /**
   * Delete the key from the cache.
   * @param {K} key
   * @returns {void}
   */
  delete (key) {
    if (this.map.has(key)) {
      this.map.delete(key)
      this.#removeKeyFromQueue(key)
    }
  }

  /**
   * Remove the key from the queue.
   * @param {K} key
   * @returns {void}
   */
  #removeKeyFromQueue (key) {
    const index = this.queue.indexOf(key)
    if (index > -1) {
      this.queue.splice(index, 1)
    }
  }
}

export { encodeInBase64, Cache }
