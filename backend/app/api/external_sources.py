from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.schemas.external_source import (
    ExternalDataSourceCreate,
    ExternalDataSourceUpdate,
    ExternalDataSourceResponse,
    SyncImportResponse,
    SyncExportResponse,
)
from app.services.auth import get_current_user
from app.services.household import get_user_household
from app.services.google_sheets import (
    get_external_sources,
    get_external_source_by_id,
    create_external_source,
    update_external_source,
    delete_external_source,
    sync_import,
    sync_export,
)
from app.models import User, HouseholdMember

router = APIRouter(prefix="/api/external-sources", tags=["external-sources"])


class SyncImportRequest(BaseModel):
    payer_member_id: UUID


def get_source_response(source) -> ExternalDataSourceResponse:
    return ExternalDataSourceResponse(
        id=source.id,
        household_id=source.household_id,
        created_by_user_id=source.created_by_user_id,
        type=source.type,
        sheet_id=source.sheet_id,
        sheet_name=source.sheet_name,
        account_id=source.account_id,
        column_mapping=source.column_mapping,
        sync_direction=source.sync_direction,
        last_synced_at=source.last_synced_at,
        last_synced_row=source.last_synced_row,
        created_at=source.created_at,
        updated_at=source.updated_at,
    )


@router.get("", response_model=list[ExternalDataSourceResponse])
def list_external_sources(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all external data sources for the household"""
    household = get_user_household(db, current_user.id)
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't belong to any household",
        )

    sources = get_external_sources(db, household.id)
    return [get_source_response(s) for s in sources]


@router.post("/google-sheet", response_model=ExternalDataSourceResponse, status_code=status.HTTP_201_CREATED)
def create_google_sheet_source(
    source_data: ExternalDataSourceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Register a Google Sheet as an external data source"""
    household = get_user_household(db, current_user.id)
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't belong to any household",
        )

    # Validate type
    if source_data.type != "google_sheet":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only 'google_sheet' type is supported",
        )

    # Validate sync_direction
    if source_data.sync_direction not in ("import", "export", "both"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="sync_direction must be 'import', 'export', or 'both'",
        )

    source = create_external_source(db, source_data, household.id, current_user.id)
    return get_source_response(source)


@router.get("/{source_id}", response_model=ExternalDataSourceResponse)
def get_single_external_source(
    source_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single external data source"""
    household = get_user_household(db, current_user.id)
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't belong to any household",
        )

    source = get_external_source_by_id(db, source_id)
    if not source or source.household_id != household.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="External data source not found",
        )

    return get_source_response(source)


@router.patch("/{source_id}", response_model=ExternalDataSourceResponse)
def update_existing_external_source(
    source_id: UUID,
    source_data: ExternalDataSourceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an external data source"""
    household = get_user_household(db, current_user.id)
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't belong to any household",
        )

    source = get_external_source_by_id(db, source_id)
    if not source or source.household_id != household.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="External data source not found",
        )

    # Validate sync_direction if provided
    if source_data.sync_direction and source_data.sync_direction not in ("import", "export", "both"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="sync_direction must be 'import', 'export', or 'both'",
        )

    source = update_external_source(db, source, source_data)
    return get_source_response(source)


@router.delete("/{source_id}")
def delete_existing_external_source(
    source_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an external data source"""
    household = get_user_household(db, current_user.id)
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't belong to any household",
        )

    source = get_external_source_by_id(db, source_id)
    if not source or source.household_id != household.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="External data source not found",
        )

    delete_external_source(db, source)
    return {"message": "External data source deleted"}


@router.post("/{source_id}/sync-import", response_model=SyncImportResponse)
def sync_import_from_source(
    source_id: UUID,
    request: SyncImportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Import data from external source (Google Sheet)"""
    household = get_user_household(db, current_user.id)
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't belong to any household",
        )

    source = get_external_source_by_id(db, source_id)
    if not source or source.household_id != household.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="External data source not found",
        )

    if source.sync_direction not in ("import", "both"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This source is not configured for import",
        )

    # Validate payer_member_id
    member = db.query(HouseholdMember).filter(
        HouseholdMember.id == request.payer_member_id,
        HouseholdMember.household_id == household.id,
    ).first()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payer_member_id",
        )

    try:
        result = sync_import(db, source, request.payer_member_id)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/{source_id}/sync-export", response_model=SyncExportResponse)
def sync_export_to_source(
    source_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export data to external source (Google Sheet)"""
    household = get_user_household(db, current_user.id)
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't belong to any household",
        )

    source = get_external_source_by_id(db, source_id)
    if not source or source.household_id != household.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="External data source not found",
        )

    if source.sync_direction not in ("export", "both"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This source is not configured for export",
        )

    try:
        result = sync_export(db, source)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
