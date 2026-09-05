// Read the loaded Kong configuration, not just its localhost URL or a YAML file.
// No credentials are sent to this container-local, read-only control plane.
export function validateGateway({ services, routes, plugins, upstreams }, check) {
  const expected = new Map([
    ['/auth/v1/', ['auth-v1', 'auth', 9999, '/']],
    ['/auth/v1/verify', ['auth-v1-open', 'auth', 9999, '/verify']],
    ['/auth/v1/callback', ['auth-v1-open-callback', 'auth', 9999, '/callback']],
    ['/auth/v1/authorize', ['auth-v1-open-authorize', 'auth', 9999, '/authorize']],
    ['/rest/v1/', ['rest-v1', 'rest', 3000, '/']],
  ]);
  check([services, routes, plugins, upstreams].every(Array.isArray), 'GATEWAY_RESPONSE_INVALID');
  // Upstream balancers could replace an otherwise local-looking service host.
  check(upstreams.length === 0, 'GATEWAY_UPSTREAM_REFUSED');
  const seen = new Set();
  for (const route of routes) {
    check(Array.isArray(route.paths) && route.paths.length > 0, 'GATEWAY_ROUTE_REFUSED');
    for (const prefix of route.paths) {
      // Refuse regex/catch-all/ambiguous routes that could shadow the two API paths.
      check(typeof prefix === 'string' && /^\/[a-zA-Z0-9_./-]+$/.test(prefix) &&
        !prefix.includes('..') && !prefix.includes('//'), 'GATEWAY_ROUTE_REFUSED');
      const overlaps = ['/auth/v1/', '/rest/v1/'].some(api =>
        prefix.startsWith(api) || api.startsWith(prefix));
      if (!overlaps) continue;
      const spec = expected.get(prefix);
      const service = services.find(item => item.id === route.service?.id);
      check(spec && !seen.has(prefix) && route.strip_path === true &&
        !route.hosts && !route.methods && !route.headers && !route.snis &&
        route.protocols?.includes('http') && service?.name === spec[0] &&
        service.protocol === 'http' && service.host === 'supabase_' + spec[1] + '_Workout-Journal' &&
        service.port === spec[2] && service.path === spec[3], 'GATEWAY_TARGET_NOT_PROVEN');
      seen.add(prefix);
    }
  }
  check(seen.size === expected.size, 'GATEWAY_ROUTE_MISSING');
  // In particular, refuse logging, forwarding or arbitrary-code plugins.
  check(plugins.every(plugin => ['cors', 'request-transformer'].includes(plugin.name)),
    'GATEWAY_PLUGIN_REFUSED');
}
