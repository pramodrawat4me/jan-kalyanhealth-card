from fastapi import APIRouter

from app.api.v1.routers import (
    admin_auth,
    admin_customers,
    admin_partners,
    admin_reports,
    auth,
    cards,
    customers,
    hospitals,
    locations,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(admin_auth.router)
api_router.include_router(locations.router)
api_router.include_router(locations.admin_router)
api_router.include_router(customers.router)
api_router.include_router(cards.router)
api_router.include_router(cards.admin_router)
api_router.include_router(hospitals.router)
api_router.include_router(hospitals.admin_router)
api_router.include_router(admin_partners.router)
api_router.include_router(admin_customers.router)
api_router.include_router(admin_reports.router)