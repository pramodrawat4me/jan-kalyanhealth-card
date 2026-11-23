"""Partner-scoped customer registration, listing, search, and soft delete.

Every route depends on `get_current_partner`, and every service/repository
call below is passed `partner.id` explicitly — there is no code path here
that can read another partner's customers.
"""

from __future__ import annotations

from datetime import date, datetime

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.api.v1.deps import Pagination, get_current_partner, get_db, get_settings_dep, get_storage
from app.core.config import Settings
from app.core.exceptions import ValidationError
from app.core.file_storage import FileStorage
from app.models.customer import Gender
from app.models.partner import Partner
from app.repositories.customer_repo import CustomerRepository
from app.repositories.print_log_repo import PrintLogRepository
from app.schemas.common import ApiResponse, build_meta
from app.schemas.customer import CustomerCreate, CustomerFindQuery, CustomerListItem, CustomerOut, CustomerUpdate
from app.services import customer_service

router = APIRouter(prefix="/customers", tags=["customers"])


def _to_out(customer, storage: FileStorage, last_printed_at: datetime | None = None) -> CustomerOut:
    return CustomerOut(
        id=customer.id,
        card_id=customer.card_id,
        partner_id=customer.partner_id,
        name=customer.name,
        father_husband=customer.father_husband,
        mobile=customer.mobile,
        aadhaar_last4=customer.aadhaar_last4,
        dob=customer.dob,
        gender=customer.gender,
        address=customer.address,
        city_id=customer.city_id,
        city_name=customer.city.name if customer.city else None,
        photo_url=customer_service.resolve_photo_url(storage, customer),
        entry_date=customer.entry_date,
        validity_date=customer.validity_date,
        last_printed_at=last_printed_at,
    )


def _to_list_item(customer, storage: FileStorage, last_printed_at: datetime | None = None) -> CustomerListItem:
    return CustomerListItem(
        id=customer.id,
        card_id=customer.card_id,
        name=customer.name,
        father_husband=customer.father_husband,
        mobile=customer.mobile,
        dob=customer.dob,
        gender=customer.gender,
        photo_url=customer_service.resolve_photo_url(storage, customer),
        validity_date=customer.validity_date,
        last_printed_at=last_printed_at,
    )


@router.get("", response_model=ApiResponse[list[CustomerListItem]])
def list_customers(
    pagination: Pagination = Depends(),
    search: str | None = None,
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db),
    storage: FileStorage = Depends(get_storage),
) -> ApiResponse[list[CustomerListItem]]:
    items, total = CustomerRepository(db).list_for_partner(partner.id, pagination.page, pagination.limit, search)
    print_map = PrintLogRepository(db).last_printed_map([c.id for c in items])
    return ApiResponse(
        data=[_to_list_item(c, storage, print_map.get(c.id)) for c in items],
        meta=build_meta(pagination.page, pagination.limit, total),
    )


@router.post("", response_model=ApiResponse[CustomerOut], status_code=201)
def add_customer(
    name: str = Form(...),
    father_husband: str = Form(...),
    mobile: str = Form(...),
    aadhaar_no: str = Form(...),
    address: str = Form(...),
    city_id: int = Form(...),
    dob: date = Form(...),
    gender: Gender = Form(...),
    photo: UploadFile = File(...),
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
    storage: FileStorage = Depends(get_storage),
) -> ApiResponse[CustomerOut]:
    payload = CustomerCreate(
        name=name,
        father_husband=father_husband,
        mobile=mobile,
        aadhaar_no=aadhaar_no,
        address=address,
        city_id=city_id,
        dob=dob,
        gender=gender,
    )
    photo_bytes = photo.file.read()
    if not photo_bytes:
        raise ValidationError("A customer photo is required.", fields={"photo": "Required"})

    customer = customer_service.create_customer(
        db,
        settings,
        storage,
        partner.id,
        name=payload.name,
        father_husband=payload.father_husband,
        mobile=payload.mobile,
        aadhaar_no=payload.aadhaar_no,
        address=payload.address,
        city_id=payload.city_id,
        dob=payload.dob,
        gender=payload.gender,
        photo_bytes=photo_bytes,
    )
    db.commit()

    return ApiResponse(data=_to_out(customer, storage), message="Customer added successfully")


@router.get("/today", response_model=ApiResponse[list[CustomerListItem]])
def todays_customers(
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db),
    storage: FileStorage = Depends(get_storage),
) -> ApiResponse[list[CustomerListItem]]:
    items = CustomerRepository(db).list_created_today(partner.id)
    print_map = PrintLogRepository(db).last_printed_map([c.id for c in items])
    return ApiResponse(data=[_to_list_item(c, storage, print_map.get(c.id)) for c in items])


@router.get("/find", response_model=ApiResponse[list[CustomerOut]])
def find_customer(
    mobile: str | None = None,
    dob: date | None = None,
    card_id: str | None = None,
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db),
    storage: FileStorage = Depends(get_storage),
) -> ApiResponse[list[CustomerOut]]:
    query = CustomerFindQuery(mobile=mobile, dob=dob, card_id=card_id)
    if not (query.mobile or query.card_id):
        raise ValidationError(
            "Provide at least a mobile number or a card ID to search.",
            fields={"mobile": "Required if Card ID is not provided"},
        )

    results = CustomerRepository(db).find(partner.id, query.mobile, query.dob, query.card_id)
    print_map = PrintLogRepository(db).last_printed_map([c.id for c in results])
    return ApiResponse(data=[_to_out(c, storage, print_map.get(c.id)) for c in results])


@router.get("/{customer_id}", response_model=ApiResponse[CustomerOut])
def get_customer(
    customer_id: int,
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db),
    storage: FileStorage = Depends(get_storage),
) -> ApiResponse[CustomerOut]:
    customer = customer_service.get_customer_or_404(db, partner.id, customer_id)
    last_printed_at = PrintLogRepository(db).last_printed_at(customer.id)
    return ApiResponse(data=_to_out(customer, storage, last_printed_at))


@router.put("/{customer_id}", response_model=ApiResponse[CustomerOut])
def update_customer(
    customer_id: int,
    name: str = Form(...),
    father_husband: str = Form(...),
    mobile: str = Form(...),
    address: str = Form(...),
    city_id: int = Form(...),
    dob: date = Form(...),
    gender: Gender = Form(...),
    aadhaar_no: str | None = Form(None),
    photo: UploadFile | None = File(None),
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
    storage: FileStorage = Depends(get_storage),
) -> ApiResponse[CustomerOut]:
    payload = CustomerUpdate(
        name=name,
        father_husband=father_husband,
        mobile=mobile,
        aadhaar_no=aadhaar_no,
        address=address,
        city_id=city_id,
        dob=dob,
        gender=gender,
    )
    photo_bytes: bytes | None = None
    if photo is not None and photo.filename:
        photo_bytes = photo.file.read()
        if not photo_bytes:
            raise ValidationError("Uploaded photo is empty.", fields={"photo": "Invalid photo"})

    customer = customer_service.update_customer(
        db,
        settings,
        storage,
        partner.id,
        customer_id,
        name=payload.name,
        father_husband=payload.father_husband,
        mobile=payload.mobile,
        aadhaar_no=payload.aadhaar_no,
        address=payload.address,
        city_id=payload.city_id,
        dob=payload.dob,
        gender=payload.gender,
        photo_bytes=photo_bytes,
    )
    db.commit()
    last_printed_at = PrintLogRepository(db).last_printed_at(customer.id)
    return ApiResponse(data=_to_out(customer, storage, last_printed_at), message="Customer updated successfully")


@router.delete("/{customer_id}", response_model=ApiResponse[None])
def delete_customer(
    customer_id: int,
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db),
) -> ApiResponse[None]:
    customer_service.delete_customer(db, partner.id, customer_id)
    db.commit()
    return ApiResponse(message="Customer deleted successfully")
