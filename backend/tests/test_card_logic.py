"""Unit tests for the two rules the whole product hinges on: card ID
generation and validity-date derivation."""

from __future__ import annotations

from datetime import date

from app.services.customer_service import _generate_card_id, calculate_validity_date
from app.repositories.customer_repo import CustomerRepository


class _StubRepo:
    """Fakes just enough of CustomerRepository to test collision retries
    without touching a database."""

    def __init__(self, existing_ids: set[str]) -> None:
        self._existing_ids = existing_ids

    def card_id_exists(self, card_id: str) -> bool:
        return card_id in self._existing_ids


def test_card_id_has_date_prefix_and_six_digit_suffix():
    issue_date = date(2026, 6, 19)
    card_id = _generate_card_id(_StubRepo(set()), issue_date)

    assert card_id.startswith("20260619")
    assert len(card_id) == 14
    assert card_id[8:].isdigit()


def test_card_id_retries_on_collision():
    issue_date = date(2026, 6, 19)
    # Force the first several candidates to collide; the generator must
    # eventually produce something not in this set rather than raising.
    colliding = _StubRepo({f"20260619{100000 + i}" for i in range(50)})

    card_id = _generate_card_id(colliding, issue_date)

    assert not colliding.card_id_exists(card_id)


def test_validity_date_is_three_years_after_entry_date():
    assert calculate_validity_date(date(2026, 6, 19)) == date(2029, 6, 19)


def test_validity_date_handles_leap_day_entry():
    # 2028 is a leap year; 2031 is not, so Feb 29 must land on Feb 28.
    assert calculate_validity_date(date(2028, 2, 29)) == date(2031, 2, 28)


def test_customer_repository_is_the_only_way_in_and_always_needs_partner_id():
    """Guardrail test: every public read method on CustomerRepository must
    require a partner_id, keeping cross-partner leakage structurally hard to
    introduce. This will fail loudly if someone adds a partner-less method.

    Excluded: `create` (takes a fully-built Customer), `card_id_exists` and
    `count_for_partners` (global integrity checks, not per-partner reads),
    and `soft_delete` (operates on a Customer object the caller already
    fetched through a partner-scoped lookup).
    """

    import inspect

    for name, method in inspect.getmembers(CustomerRepository, predicate=inspect.isfunction):
        if name.startswith("_") or name in {"create", "card_id_exists", "count_for_partners", "soft_delete"}:
            continue
        params = list(inspect.signature(method).parameters)
        assert "partner_id" in params, f"CustomerRepository.{name} is missing a partner_id filter"
