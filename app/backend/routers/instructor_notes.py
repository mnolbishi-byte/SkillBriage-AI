import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.instructor_notes import Instructor_notesService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/instructor_notes", tags=["instructor_notes"])


# ---------- Pydantic Schemas ----------
class Instructor_notesData(BaseModel):
    """Entity data schema (for create/update)"""
    student_user_id: str
    note_text: str
    note_type: str
    created_at: datetime


class Instructor_notesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    student_user_id: Optional[str] = None
    note_text: Optional[str] = None
    note_type: Optional[str] = None
    created_at: Optional[datetime] = None


class Instructor_notesResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    student_user_id: str
    note_text: str
    note_type: str
    created_at: datetime

    class Config:
        from_attributes = True


class Instructor_notesListResponse(BaseModel):
    """List response schema"""
    items: List[Instructor_notesResponse]
    total: int
    skip: int
    limit: int


class Instructor_notesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Instructor_notesData]


class Instructor_notesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Instructor_notesUpdateData


class Instructor_notesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Instructor_notesBatchUpdateItem]


class Instructor_notesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Instructor_notesListResponse)
async def query_instructor_notess(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query instructor_notess with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying instructor_notess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Instructor_notesService(db)
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
        logger.debug(f"Found {result['total']} instructor_notess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying instructor_notess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Instructor_notesListResponse)
async def query_instructor_notess_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query instructor_notess with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying instructor_notess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Instructor_notesService(db)
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
        logger.debug(f"Found {result['total']} instructor_notess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying instructor_notess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Instructor_notesResponse)
async def get_instructor_notes(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single instructor_notes by ID (user can only see their own records)"""
    logger.debug(f"Fetching instructor_notes with id: {id}, fields={fields}")
    
    service = Instructor_notesService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Instructor_notes with id {id} not found")
            raise HTTPException(status_code=404, detail="Instructor_notes not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching instructor_notes {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Instructor_notesResponse, status_code=201)
async def create_instructor_notes(
    data: Instructor_notesData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new instructor_notes"""
    logger.debug(f"Creating new instructor_notes with data: {data}")
    
    service = Instructor_notesService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create instructor_notes")
        
        logger.info(f"Instructor_notes created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating instructor_notes: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating instructor_notes: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Instructor_notesResponse], status_code=201)
async def create_instructor_notess_batch(
    request: Instructor_notesBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple instructor_notess in a single request"""
    logger.debug(f"Batch creating {len(request.items)} instructor_notess")
    
    service = Instructor_notesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} instructor_notess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Instructor_notesResponse])
async def update_instructor_notess_batch(
    request: Instructor_notesBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple instructor_notess in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} instructor_notess")
    
    service = Instructor_notesService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} instructor_notess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Instructor_notesResponse)
async def update_instructor_notes(
    id: int,
    data: Instructor_notesUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing instructor_notes (requires ownership)"""
    logger.debug(f"Updating instructor_notes {id} with data: {data}")

    service = Instructor_notesService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Instructor_notes with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Instructor_notes not found")
        
        logger.info(f"Instructor_notes {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating instructor_notes {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating instructor_notes {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_instructor_notess_batch(
    request: Instructor_notesBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple instructor_notess by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} instructor_notess")
    
    service = Instructor_notesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} instructor_notess successfully")
        return {"message": f"Successfully deleted {deleted_count} instructor_notess", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_instructor_notes(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single instructor_notes by ID (requires ownership)"""
    logger.debug(f"Deleting instructor_notes with id: {id}")
    
    service = Instructor_notesService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Instructor_notes with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Instructor_notes not found")
        
        logger.info(f"Instructor_notes {id} deleted successfully")
        return {"message": "Instructor_notes deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting instructor_notes {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")