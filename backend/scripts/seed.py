"""Development seed data: a minimal location hierarchy, one admin, one
partner, a couple of demo customers, and a handful of hospitals.

Idempotent — safe to run multiple times against the same database; it looks
up existing rows by their natural key before inserting.

Usage (from backend/):
    python -m scripts.seed
"""

from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.core.security import hash_password  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.models.admin import Admin  # noqa: E402
from app.models.customer import Customer, Gender  # noqa: E402
from app.models.hospital import Hospital  # noqa: E402
from app.models.location import City, State, Tahsil  # noqa: E402
from app.models.partner import Partner  # noqa: E402
from app.services.crypto_service import encrypt_aadhaar, last4  # noqa: E402
from app.services.customer_service import calculate_validity_date  # noqa: E402
from app.core.config import get_settings  # noqa: E402

LOCATIONS = {
    "Madhya Pradesh": {
        "Ashoknagar": ["Ashoknagar", "Chanderi", "Isagarh"],
        "Vidisha": ["Vidisha", "Lateri", "Gyaraspur"],
    },
    "Rajasthan": {
        "Kota": ["Kota", "Ramganj Mandi"],
    },
}

HOSPITALS = [
    {
        "name": "City Care Multispeciality Hospital",
        "address": "Station Road",
        "city": "Ashoknagar",
        "phone": "07543-222100",
        "discount_details": "20% discount on OPD consultation, 10% on room tariff.",
    },
    {
        "name": "Vidisha General Hospital",
        "address": "Civil Lines",
        "city": "Vidisha",
        "phone": "07592-233100",
        "discount_details": "Flat 15% discount on all diagnostic tests.",
    },
    {
        "name": "Kota Medicare Center",
        "address": "Nayapura",
        "city": "Kota",
        "phone": "0744-2451100",
        "discount_details": "Free consultation; 10% discount on medicines.",
    },
]


def seed() -> None:
    settings = get_settings()
    db = SessionLocal()
    try:
        city_by_name: dict[str, City] = {}

        for state_name, cities in LOCATIONS.items():
            state = db.query(State).filter(State.name == state_name).one_or_none()
            if state is None:
                state = State(name=state_name)
                db.add(state)
                db.flush()

            for city_name, tahsils in cities.items():
                city = db.query(City).filter(City.name == city_name, City.state_id == state.id).one_or_none()
                if city is None:
                    city = City(name=city_name, state_id=state.id)
                    db.add(city)
                    db.flush()
                city_by_name[city_name] = city

                for tahsil_name in tahsils:
                    exists = (
                        db.query(Tahsil)
                        .filter(Tahsil.name == tahsil_name, Tahsil.city_id == city.id)
                        .one_or_none()
                    )
                    if exists is None:
                        db.add(Tahsil(name=tahsil_name, city_id=city.id, state_id=state.id))

        db.flush()

        admin = db.query(Admin).filter(Admin.mobile == "9999999999").one_or_none()
        if admin is None:
            admin = Admin(name="Super Admin", mobile="9999999999", password_hash=hash_password("Admin@123"))
            db.add(admin)

        ashoknagar = city_by_name["Ashoknagar"]
        vidisha = city_by_name["Vidisha"]
        ashoknagar_tahsil = db.query(Tahsil).filter(Tahsil.city_id == ashoknagar.id).first()

        partner = db.query(Partner).filter(Partner.mobile == "9098475371").one_or_none()
        if partner is None:
            partner = Partner(
                name="Boby Rawat",
                mobile="9098475371",
                password_hash=hash_password("Partner@123"),
                state_id=ashoknagar.state_id,
                city_id=ashoknagar.id,
                tahsil_id=ashoknagar_tahsil.id if ashoknagar_tahsil else None,
                is_active=True,
            )
            db.add(partner)
            db.flush()

        if db.query(Customer).filter(Customer.partner_id == partner.id).count() == 0:
            entry_date = date.today()
            demo_customers = [
                {
                    "name": "Nitin Raghuwanshi",
                    "father_husband": "Prakash Singh",
                    "mobile": "6266607840",
                    "aadhaar_no": "123456789012",
                    "dob": date(2007, 9, 15),
                    "gender": Gender.MALE,
                    "address": "Kirroda",
                    "city": ashoknagar,
                },
                {
                    "name": "Saroj Bai Jatav",
                    "father_husband": "Kanhaiyaram",
                    "mobile": "9343099468",
                    "aadhaar_no": "987654321098",
                    "dob": date(1983, 1, 1),
                    "gender": Gender.FEMALE,
                    "address": "Jolan, Ashoknagar",
                    "city": ashoknagar,
                },
            ]
            for i, payload in enumerate(demo_customers):
                card_id = f"{entry_date.strftime('%Y%m%d')}{100000 + i}"
                db.add(
                    Customer(
                        card_id=card_id,
                        partner_id=partner.id,
                        name=payload["name"],
                        father_husband=payload["father_husband"],
                        mobile=payload["mobile"],
                        aadhaar_encrypted=encrypt_aadhaar(payload["aadhaar_no"], settings.aadhaar_encryption_key),
                        aadhaar_last4=last4(payload["aadhaar_no"]),
                        dob=payload["dob"],
                        gender=payload["gender"],
                        address=payload["address"],
                        city_id=payload["city"].id,
                        photo_path=None,
                        entry_date=entry_date,
                        validity_date=calculate_validity_date(entry_date),
                    )
                )

        for hospital_data in HOSPITALS:
            exists = db.query(Hospital).filter(Hospital.name == hospital_data["name"]).one_or_none()
            if exists is not None:
                continue
            city = city_by_name.get(hospital_data["city"])
            db.add(
                Hospital(
                    name=hospital_data["name"],
                    address=hospital_data["address"],
                    city_id=city.id if city else None,
                    state_id=city.state_id if city else None,
                    phone=hospital_data["phone"],
                    discount_details=hospital_data["discount_details"],
                    is_active=True,
                )
            )

        db.commit()
        print("Seed complete.")
        print("Admin login   -> mobile: 9999999999  password: Admin@123")
        print("Partner login -> mobile: 9098475371  password: Partner@123")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
