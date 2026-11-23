from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.api.v1.deps import Pagination, get_current_admin, get_db, get_settings_dep, get_storage
from app.core.config import Settings
from app.core.file_storage import FileStorage
from app.models.admin import Admin
from app.repositories.customer_repo import CustomerRepository
from app.repositories.partner_repo import PartnerRepository
from app.repositories.print_log_repo import PrintLogRepository
from app.schemas.common import ApiResponse, build_meta
from app.schemas.partner import PartnerAdminOut, PartnerCreate
from app.services import partner_service

router = APIRouter(prefix="/admin/partners", tags=["admin-partners"])


def _with_stats(db: Session, storage: FileStorage, partners: list) -> list[PartnerAdminOut]:
    ids = [p.id for p in partners]
    customer_counts = CustomerRepository(db).count_for_partners(ids)
    print_counts = PrintLogRepository(db).count_for_partners(ids)
    return [
        PartnerAdminOut(
            id=p.id,
            name=p.name,
            mobile=p.mobile,
            is_active=p.is_active,
            state_id=p.state_id,
            city_id=p.city_id,
            tahsil_id=p.tahsil_id,
            created_at=p.created_at,
            photo_url=partner_service.resolve_photo_url(storage, p),
            customer_count=customer_counts.get(p.id, 0),
            print_count=print_counts.get(p.id, 0),
        )
        for p in partners
    ]


@router.get("", response_model=ApiResponse[list[PartnerAdminOut]])
def list_partners(
    pagination: Pagination = Depends(),
    search: str | None = None,
    db: Session = Depends(get_db),
    storage: FileStorage = Depends(get_storage),
    _admin: Admin = Depends(get_current_admin),
) -> ApiResponse[list[PartnerAdminOut]]:
    partners, total = PartnerRepository(db).list_all(pagination.page, pagination.limit, search)
    return ApiResponse(
        data=_with_stats(db, storage, partners),
        meta=build_meta(pagination.page, pagination.limit, total),
    )


@router.post("", response_model=ApiResponse[PartnerAdminOut], status_code=201)
def create_partner(
    name: str = Form(...),
    mobile: str = Form(...),
    password: str = Form(...),
    state_id: int = Form(...),
    city_id: int = Form(...),
    tahsil_id: int = Form(...),
    photo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
    storage: FileStorage = Depends(get_storage),
    _admin: Admin = Depends(get_current_admin),
) -> ApiResponse[PartnerAdminOut]:
    payload = PartnerCreate(
        name=name,
        mobile=mobile,
        password=password,
        state_id=state_id,
        city_id=city_id,
        tahsil_id=tahsil_id,
    )
    photo_bytes = photo.file.read() if photo is not None and photo.filename else None

    partner = partner_service.create_partner(db, settings, storage, payload, photo_bytes=photo_bytes)
    db.commit()
    return ApiResponse(data=_with_stats(db, storage, [partner])[0], message="Partner created successfully")


@router.get("/{partner_id}", response_model=ApiResponse[PartnerAdminOut])
def get_partner(
    partner_id: int,
    db: Session = Depends(get_db),
    storage: FileStorage = Depends(get_storage),
    _admin: Admin = Depends(get_current_admin),
) -> ApiResponse[PartnerAdminOut]:
    partner = partner_service.get_partner_or_404(db, partner_id)
    return ApiResponse(data=_with_stats(db, storage, [partner])[0])


@router.patch("/{partner_id}/activate", response_model=ApiResponse[PartnerAdminOut])
def activate_partner(
    partner_id: int,
    db: Session = Depends(get_db),
    storage: FileStorage = Depends(get_storage),
    _admin: Admin = Depends(get_current_admin),
) -> ApiResponse[PartnerAdminOut]:
    partner = partner_service.set_partner_active(db, partner_id, True)
    db.commit()
    return ApiResponse(data=_with_stats(db, storage, [partner])[0], message="Partner activated")


@router.patch("/{partner_id}/deactivate", response_model=ApiResponse[PartnerAdminOut])
def deactivate_partner(
    partner_id: int,
    db: Session = Depends(get_db),
    storage: FileStorage = Depends(get_storage),
    _admin: Admin = Depends(get_current_admin),
) -> ApiResponse[PartnerAdminOut]:
    partner = partner_service.set_partner_active(db, partner_id, False)
    db.commit()
    return ApiResponse(data=_with_stats(db, storage, [partner])[0], message="Partner deactivated")


@router.delete("/{partner_id}", response_model=ApiResponse[None])
def delete_partner(
    partner_id: int,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> ApiResponse[None]:
    partner_service.delete_partner(db, partner_id)
    db.commit()
    return ApiResponse(message="Partner deleted successfully")
