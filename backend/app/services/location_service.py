"""Location master business rules — currently only deletion.

Creation stays in the router (a validated insert, nothing more). Deletion
carries real rules: a state/city/tahsil that any partner, customer, or
hospital still points at must not disappear (their foreign keys and
addresses would dangle), while an unused entry cascades down its own
subtree — deleting a state takes its unused cities and tahsils with it,
since child locations are pure master data with no life of their own.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.repositories.location_repo import LocationRepository


def _ensure_unused(entity_label: str, usage: dict[str, int]) -> None:
    """Raises 409 with a human message naming exactly what blocks the
    delete, e.g. 'used by 2 partners and 1 hospital'."""

    parts = [
        f"{count} {label.rstrip('s') if count == 1 else label}"
        for label, count in usage.items()
        if count > 0
    ]
    if not parts:
        return
    listing = parts[0] if len(parts) == 1 else ", ".join(parts[:-1]) + " and " + parts[-1]
    raise ConflictError(f"This {entity_label} is used by {listing} and can't be deleted.")


def delete_tahsil(db: Session, tahsil_id: int) -> None:
    repo = LocationRepository(db)
    tahsil = repo.get_tahsil(tahsil_id)
    if tahsil is None:
        raise NotFoundError("Tahsil not found.")
    _ensure_unused("tahsil", repo.usage_for_tahsil(tahsil_id))
    repo.delete_tahsil(tahsil)


def delete_city(db: Session, city_id: int) -> None:
    """A partner registered under a tahsil of this city also carries this
    city_id (the hierarchy is validated at creation), so the city-level
    usage check covers the whole subtree — unused child tahsils are then
    safe to cascade."""

    repo = LocationRepository(db)
    if repo.get_city(city_id) is None:
        raise NotFoundError("City not found.")
    _ensure_unused("city", repo.usage_for_city(city_id))
    repo.delete_city_cascade(city_id)


def delete_state(db: Session, state_id: int) -> None:
    repo = LocationRepository(db)
    if repo.get_state(state_id) is None:
        raise NotFoundError("State not found.")
    _ensure_unused("state", repo.usage_for_state(state_id))
    repo.delete_state_cascade(state_id)
