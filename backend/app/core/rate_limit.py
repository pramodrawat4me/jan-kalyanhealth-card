from slowapi import Limiter
from slowapi.util import get_remote_address

# A single shared limiter instance, keyed by client IP. Applied selectively
# via the @limiter.limit(...) decorator on the login and public card routes
# per the security spec, rather than globally on every route.
limiter = Limiter(key_func=get_remote_address)
