"""Domain exceptions and their mapping to the standard API error envelope.

Services and repositories raise these instead of HTTPException so business
logic stays framework-agnostic and testable without spinning up FastAPI.
"""

from __future__ import annotations


class AppError(Exception):
    """Base class for all handled application errors."""

    status_code: int = 400
    error_code: str = "APP_ERROR"

    def __init__(self, message: str, fields: dict[str, str] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.fields = fields


class ValidationError(AppError):
    status_code = 400
    error_code = "VALIDATION_ERROR"


class NotFoundError(AppError):
    status_code = 404
    error_code = "NOT_FOUND"


class ConflictError(AppError):
    status_code = 409
    error_code = "CONFLICT"


class InvalidCredentialsError(AppError):
    status_code = 401
    error_code = "INVALID_CREDENTIALS"

    def __init__(self, message: str = "Invalid mobile number or password.") -> None:
        super().__init__(message)


class AccountDeactivatedError(AppError):
    status_code = 403
    error_code = "ACCOUNT_DEACTIVATED"

    def __init__(self, message: str = "Your account has been deactivated. Contact admin.") -> None:
        super().__init__(message)


class UnauthorizedError(AppError):
    status_code = 401
    error_code = "UNAUTHORIZED"

    def __init__(self, message: str = "Authentication required.") -> None:
        super().__init__(message)


class ForbiddenError(AppError):
    status_code = 403
    error_code = "FORBIDDEN"

    def __init__(self, message: str = "You do not have access to this resource.") -> None:
        super().__init__(message)


class PayloadTooLargeError(AppError):
    status_code = 413
    error_code = "PAYLOAD_TOO_LARGE"
