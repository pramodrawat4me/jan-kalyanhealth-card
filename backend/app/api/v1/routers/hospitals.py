"""Hospital directory.

The partner-facing list is intentionally global (no partner filter) — every
partner and the public QR page see the same active hospital set. Write
operations are admin-only and live under /admin/hospitals in this same
router module.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.deps import Pagination, get_current_admin, get_current_partner, get_db
from app.models.admin import Admin
from app.repositories.hospital_repo import HospitalRepository
from app.schemas.common import ApiResponse, build_meta
from app.schemas.hospital import HospitalCreate, HospitalOut, HospitalUpdate
from app.services import hospital_service

router = APIRouter(tags=["hospitals"])


@router.get("/hospitals", response_model=ApiResponse[list[HospitalOut]])
def list_hospitals(
    db: Session = Depends(get_db),
    _partner=Depends(get_current_partner),
) -> ApiResponse[list[HospitalOut]]:
    hospitals = HospitalRepository(db).list_active()
    return ApiResponse(data=[HospitalOut.model_validate(h) for h in hospitals])


admin_router = APIRouter(prefix="/admin/hospitals", tags=["admin-hospitals"])


@admin_router.get("", response_model=ApiResponse[list[HospitalOut]])
def admin_list_hospitals(
    pagination: Pagination = Depends(),
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> ApiResponse[list[HospitalOut]]:
    items, total = HospitalRepository(db).list_all(pagination.page, pagination.limit)
    return ApiResponse(
        data=[HospitalOut.model_validate(h) for h in items],
        meta=build_meta(pagination.page, pagination.limit, total),
    )


@admin_router.post("", response_model=ApiResponse[HospitalOut], status_code=201)
def admin_create_hospital(
    payload: HospitalCreate,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> ApiResponse[HospitalOut]:
    hospital = hospital_service.create_hospital(db, payload)
    db.commit()
    return ApiResponse(data=HospitalOut.model_validate(hospital), message="Hospital added successfully")


@admin_router.put("/{hospital_id}", response_model=ApiResponse[HospitalOut])
def admin_update_hospital(
    hospital_id: int,
    payload: HospitalUpdate,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> ApiResponse[HospitalOut]:
    hospital = hospital_service.update_hospital(db, hospital_id, payload)
    db.commit()
    return ApiResponse(data=HospitalOut.model_validate(hospital), message="Hospital updated successfully")


@admin_router.patch("/{hospital_id}/toggle", response_model=ApiResponse[HospitalOut])
def admin_toggle_hospital(
    hospital_id: int,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> ApiResponse[HospitalOut]:
    hospital = hospital_service.toggle_hospital(db, hospital_id)
    db.commit()
    return ApiResponse(data=HospitalOut.model_validate(hospital), message="Hospital status updated")


@admin_router.delete("/{hospital_id}", response_model=ApiResponse[None])
def admin_delete_hospital(
    hospital_id: int,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> ApiResponse[None]:
    hospital_service.delete_hospital(db, hospital_id)
    db.commit()
    return ApiResponse(message="Hospital deleted successfully")
