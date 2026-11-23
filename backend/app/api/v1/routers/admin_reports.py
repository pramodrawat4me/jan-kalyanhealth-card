"""Admin printing reports (per-partner totals over a date range) and the
dashboard analytics summary widgets."""

from __future__ import annotations

import csv
import io
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_admin, get_db
from app.models.admin import Admin
from app.models.customer import Customer
from app.models.hospital import Hospital
from app.models.partner import Partner
from app.repositories.partner_repo import PartnerRepository
from app.repositories.print_log_repo import PrintLogRepository
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/admin", tags=["admin-reports"])


class PartnerPrintingReportRow(BaseModel):
    partner_id: int
    partner_name: str
    partner_mobile: str
    print_count: int


class DashboardSummary(BaseModel):
    total_cards_issued: int
    active_partners: int
    total_partners: int
    cards_printed_today: int
    hospital_count: int


def _default_range(start_date: date | None, end_date: date | None) -> tuple[date, date]:
    end = end_date or date.today()
    start = start_date or (end - timedelta(days=30))
    return start, end


@router.get("/reports/printings", response_model=ApiResponse[list[PartnerPrintingReportRow]])
def printing_report(
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> ApiResponse[list[PartnerPrintingReportRow]]:
    start, end = _default_range(start_date, end_date)
    rows = PrintLogRepository(db).report_by_partner(start, end)
    partner_repo = PartnerRepository(db)

    result = []
    for partner_id, count in rows:
        partner = partner_repo.get_by_id(partner_id)
        result.append(
            PartnerPrintingReportRow(
                partner_id=partner_id,
                partner_name=partner.name if partner else "-",
                partner_mobile=partner.mobile if partner else "-",
                print_count=count,
            )
        )
    return ApiResponse(data=result)


@router.get("/reports/printings/export")
def export_printing_report_csv(
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> StreamingResponse:
    start, end = _default_range(start_date, end_date)
    rows = PrintLogRepository(db).report_by_partner(start, end)
    partner_repo = PartnerRepository(db)

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Partner ID", "Partner Name", "Mobile", "Cards Printed", "From", "To"])
    for partner_id, count in rows:
        partner = partner_repo.get_by_id(partner_id)
        writer.writerow(
            [
                partner_id,
                partner.name if partner else "-",
                partner.mobile if partner else "-",
                count,
                start.strftime("%d-%m-%Y"),
                end.strftime("%d-%m-%Y"),
            ]
        )

    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=printing_report.csv"},
    )


@router.get("/dashboard", response_model=ApiResponse[DashboardSummary])
def dashboard_summary(
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> ApiResponse[DashboardSummary]:
    total_cards_issued = db.execute(
        select(func.count()).select_from(Customer).where(Customer.is_deleted.is_(False))
    ).scalar_one()
    active_partners = db.execute(
        select(func.count()).select_from(Partner).where(Partner.is_active.is_(True))
    ).scalar_one()
    total_partners = db.execute(select(func.count()).select_from(Partner)).scalar_one()
    hospital_count = db.execute(
        select(func.count()).select_from(Hospital).where(Hospital.is_active.is_(True))
    ).scalar_one()
    cards_printed_today = PrintLogRepository(db).count_all_today()

    return ApiResponse(
        data=DashboardSummary(
            total_cards_issued=total_cards_issued,
            active_partners=active_partners,
            total_partners=total_partners,
            cards_printed_today=cards_printed_today,
            hospital_count=hospital_count,
        )
    )
