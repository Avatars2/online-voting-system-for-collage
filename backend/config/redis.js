import dotenv from 'dotenv';

dotenv.config();

// Redis client disabled - using memory storage only
const redisClient = null;

console.log('Redis disabled - using in-memory storage only');

// Fallback in-memory storage
const memoryStorage = new Map();

// Redis wrapper with fallback
class RedisService {
  constructor() {
    this.isRedisAvailable = false;
    this.fallbackToMemory = true; // Always use memory storage
    
    console.log('Using in-memory storage (Redis disabled)');
  }

  async checkRedisAvailability() {
    try {
      await redisClient.ping();
      this.isRedisAvailable = true;
      console.log('✅ Redis is available');
    } catch (error) {
      this.isRedisAvailable = false;
      this.fallbackToMemory = true;
      console.warn('⚠️  Redis not available, using memory storage');
    }
  }

  // Set key with expiration
  async set(key, value, expirationInSeconds) {
    try {
      if (this.isRedisAvailable) {
        await redisClient.setEx(key, expirationInSeconds, JSON.stringify(value));
        return true;
      }
    } catch (error) {
      console.error('Redis SET error:', error);
      this.fallbackToMemory = true;
    }

    // Fallback to memory
    memoryStorage.set(key, {
      value,
      expires: Date.now() + (expirationInSeconds * 1000)
    });
    return true;
  }

  // Get value
  async get(key) {
    try {
      if (this.isRedisAvailable) {
        const value = await redisClient.get(key);
        return value ? JSON.parse(value) : null;
      }
    } catch (error) {
      console.error('Redis GET error:', error);
      this.fallbackToMemory = true;
    }

    // Fallback to memory
    const item = memoryStorage.get(key);
    if (!item) return null;
    
    // Check expiration
    if (Date.now() > item.expires) {
      memoryStorage.delete(key);
      return null;
    }
    
    return item.value;
  }

  // Delete key
  async del(key) {
    try {
      if (this.isRedisAvailable) {
        await redisClient.del(key);
        return true;
      }
    } catch (error) {
      console.error('Redis DEL error:', error);
      this.fallbackToMemory = true;
    }

    // Fallback to memory
    memoryStorage.delete(key);
    return true;
  }

  // Check if key exists
  async exists(key) {
    try {
      if (this.isRedisAvailable) {
        const result = await redisClient.exists(key);
        return result === 1;
      }
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      this.fallbackToMemory = true;
    }

    // Fallback to memory
    const item = memoryStorage.get(key);
    if (!item) return false;
    
    // Check expiration
    if (Date.now() > item.expires) {
      memoryStorage.delete(key);
      return false;
    }
    
    return true;
  }

  // Set expiration for existing key
  async expire(key, expirationInSeconds) {
    try {
      if (this.isRedisAvailable) {
        await redisClient.expire(key, expirationInSeconds);
        return true;
      }
    } catch (error) {
      console.error('Redis EXPIRE error:', error);
      this.fallbackToMemory = true;
    }

    // Fallback to memory
    const item = memoryStorage.get(key);
    if (item) {
      item.expires = Date.now() + (expirationInSeconds * 1000);
      return true;
    }
    return false;
  }

  // Get remaining time to live
  async ttl(key) {
    try {
      if (this.isRedisAvailable) {
        return await redisClient.ttl(key);
      }
    } catch (error) {
      console.error('Redis TTL error:', error);
      this.fallbackToMemory = true;
    }

    // Fallback to memory
    const item = memoryStorage.get(key);
    if (!item) return -2; // Key doesn't exist
    
    const remaining = Math.ceil((item.expires - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  // Clear all keys (use with caution)
  async flushAll() {
    try {
      if (this.isRedisAvailable) {
        await redisClient.flushDb();
        return true;
      }
    } catch (error) {
      console.error('Redis FLUSH error:', error);
      this.fallbackToMemory = true;
    }

    // Fallback to memory
    memoryStorage.clear();
    return true;
  }

  // Get Redis client (for advanced operations)
  getClient() {
    return this.isRedisAvailable ? redisClient : null;
  }

  // Get service status
  getStatus() {
    return {
      isRedisAvailable: this.isRedisAvailable,
      fallbackToMemory: this.fallbackToMemory,
      memoryStorageSize: memoryStorage.size
    };
  }

  // Close connection
  async close() {
    try {
      if (this.isRedisAvailable) {
        await redisClient.quit();
      }
    } catch (error) {
      console.error('Redis close error:', error);
    }
  }
}

// Create and export singleton instance
const redisService = new RedisService();

export default redisService;
