import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge, register } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly httpRequestsTotal: Counter;
  private readonly credentialIssuedTotal: Counter;
  private readonly bstMintedTotal: Counter;
  private readonly stellarRpcLatency: Histogram;
  private readonly cacheHitsTotal: Counter;
  private readonly cacheMissesTotal: Counter;
  private readonly healthCheckDuration: Histogram;
  private readonly healthCheckStatus: Gauge;
  private readonly uptimeGauge: Gauge;
  private readonly activeConnections: Gauge;
  private readonly databasePoolSize: Gauge;
  private readonly redisConnectedClients: Gauge;

  constructor() {
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [register],
    });

    this.credentialIssuedTotal = new Counter({
      name: 'credential_issued_total',
      help: 'Total number of credentials issued',
      labelNames: ['credential_type'],
      registers: [register],
    });

    this.bstMintedTotal = new Counter({
      name: 'bst_minted_total',
      help: 'Total number of BST tokens minted',
      labelNames: ['user_id'],
      registers: [register],
    });

    this.stellarRpcLatency = new Histogram({
      name: 'stellar_rpc_latency_seconds',
      help: 'Stellar RPC call latency in seconds',
      labelNames: ['method', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5],
      registers: [register],
    });

    this.cacheHitsTotal = new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache'],
      registers: [register],
    });

    this.cacheMissesTotal = new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache'],
      registers: [register],
    });

    this.healthCheckDuration = new Histogram({
      name: 'health_check_duration_seconds',
      help: 'Duration of health check probes in seconds',
      labelNames: ['probe', 'status'],
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      registers: [register],
    });

    this.healthCheckStatus = new Gauge({
      name: 'health_check_up',
      help: 'Health check status per probe type (1=up, 0=down)',
      labelNames: ['probe'],
      registers: [register],
    });

    this.uptimeGauge = new Gauge({
      name: 'app_uptime_seconds',
      help: 'Application uptime in seconds',
      registers: [register],
    });

    this.activeConnections = new Gauge({
      name: 'app_active_connections',
      help: 'Number of active connections',
      registers: [register],
    });

    this.databasePoolSize = new Gauge({
      name: 'app_database_pool_size',
      help: 'Database connection pool size',
      labelNames: ['state'],
      registers: [register],
    });

    this.redisConnectedClients = new Gauge({
      name: 'app_redis_connected_clients',
      help: 'Number of Redis connected clients',
      registers: [register],
    });

    setInterval(() => {
      this.uptimeGauge.set(process.uptime());
    }, 15000);
  }

  incrementHttpRequests(method: string, route: string, statusCode: number) {
    this.httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode.toString(),
    });
  }

  incrementCredentialIssued(credentialType: string) {
    this.credentialIssuedTotal.inc({ credential_type: credentialType });
  }

  incrementBstMinted(userId: string) {
    this.bstMintedTotal.inc({ user_id: userId });
  }

  observeStellarRpcLatency(method: string, status: string, durationSeconds: number) {
    this.stellarRpcLatency.observe({ method, status }, durationSeconds);
  }

  incrementCacheHit(cache: string) {
    this.cacheHitsTotal.inc({ cache });
  }

  incrementCacheMiss(cache: string) {
    this.cacheMissesTotal.inc({ cache });
  }

  observeHealthCheckDuration(probe: string, status: string, durationSeconds: number) {
    this.healthCheckDuration.observe({ probe, status }, durationSeconds);
  }

  setHealthCheckStatus(probe: string, up: boolean) {
    this.healthCheckStatus.set({ probe }, up ? 1 : 0);
  }

  setActiveConnections(count: number) {
    this.activeConnections.set(count);
  }

  setDatabasePoolSize(state: string, size: number) {
    this.databasePoolSize.set({ state }, size);
  }

  setRedisConnectedClients(count: number) {
    this.redisConnectedClients.set(count);
  }
}
