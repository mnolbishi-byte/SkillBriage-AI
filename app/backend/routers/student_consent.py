import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.student_consent import Student_consentService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/student_consent", tags=["student_consent"])


# ---------- Pydantic Schemas ----------
class Student_consentData(BaseModel):
    """Entity data schema (for create/update)"""
    allow_tracking: bool
    student_name: str
    student_email: str = None
    created_at: datetime


class Student_consentUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    allow_tracking: Optional[bool] = None
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    created_at: Optional[datetime] = None


class Student_consentResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    allow_tracking: bool
    student_name: str
    student_email: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class Student_consentListResponse(BaseModel):
    """List response schema"""
    items: List[Student_consentResponse]
    total: int
    skip: int
    limit: int


class Student_consentBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Student_consentData]


class Student_consentBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Student_consentUpdateData


class Student_consentBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Student_consentBatchUpdateItem]


class Student_consentBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Student_consentListResponse)
async def query_student_consents(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query student_consents with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying student_consents: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Student_consentService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")
        
        result = await service.get_list(
            skip=skip, 
            limit=limit,
            query_dict=query_dict,
            sort=sort,
            user_id=str(current_user.id),
        )
        logger.debug(f"Found {result['total']} student_consents")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying student_consents: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Student_consentListResponse)
async def query_student_consents_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query student_consents with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying student_consents: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Student_consentService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")

        result = await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=query_dict,
            sort=sort
        )
        logger.debug(f"Found {result['total']} student_consents")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying student_consents: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Student_consentResponse)
async def get_student_consent(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single student_consent by ID (user can only see their own records)"""
    logger.debug(f"Fetching student_consent with id: {id}, fields={fields}")
    
    service = Student_consentService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Student_consent with id {id} not found")
            raise HTTPException(status_code=404, detail="Student_consent not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching student_consent {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Student_consentResponse, status_code=201)
async def create_student_consent(
    data: Student_consentData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new student_consent"""
    logger.debug(f"Creating new student_consent with data: {data}")
    
    service = Student_consentService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create student_consent")
        
        logger.info(f"Student_consent created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating student_consent: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating student_consent: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Student_consentResponse], status_code=201)
async def create_student_consents_batch(
    request: Student_consentBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple student_consents in a single request"""
    logger.debug(f"Batch creating {len(request.items)} student_consents")
    
    service = Student_consentService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} student_consents successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Student_consentResponse])
async def update_student_consents_batch(
    request: Student_consentBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple student_consents in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} student_consents")
    
    service = Student_consentService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} student_consents successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Student_consentResponse)
async def update_student_consent(
    id: int,
    data: Student_consentUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing student_consent (requires ownership)"""
    logger.debug(f"Updating student_consent {id} with data: {data}")

    service = Student_consentService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Student_consent with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Student_consent not found")
        
        logger.info(f"Student_consent {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating student_consent {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating student_consent {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_student_consents_batch(
    request: Student_consentBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple student_consents by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} student_consents")
    
    service = Student_consentService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} student_consents successfully")
        return {"message": f"Successfully deleted {deleted_count} student_consents", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_student_consent(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single student_consent by ID (requires ownership)"""
    logger.debug(f"Deleting student_consent with id: {id}")
    
    service = Student_consentService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Student_consent with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Student_consent not found")
        
        logger.info(f"Student_consent {id} deleted successfully")
        return {"message": "Student_consent deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting student_consent {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")