import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.simulation_attempts import Simulation_attemptsService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/simulation_attempts", tags=["simulation_attempts"])


# ---------- Pydantic Schemas ----------
class Simulation_attemptsData(BaseModel):
    """Entity data schema (for create/update)"""
    score: int
    grade: str
    errors_count: int
    errors_list: str
    duration_seconds: int
    procedure_type: str
    created_at: datetime


class Simulation_attemptsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    score: Optional[int] = None
    grade: Optional[str] = None
    errors_count: Optional[int] = None
    errors_list: Optional[str] = None
    duration_seconds: Optional[int] = None
    procedure_type: Optional[str] = None
    created_at: Optional[datetime] = None


class Simulation_attemptsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    score: int
    grade: str
    errors_count: int
    errors_list: str
    duration_seconds: int
    procedure_type: str
    created_at: datetime

    class Config:
        from_attributes = True


class Simulation_attemptsListResponse(BaseModel):
    """List response schema"""
    items: List[Simulation_attemptsResponse]
    total: int
    skip: int
    limit: int


class Simulation_attemptsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Simulation_attemptsData]


class Simulation_attemptsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Simulation_attemptsUpdateData


class Simulation_attemptsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Simulation_attemptsBatchUpdateItem]


class Simulation_attemptsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Simulation_attemptsListResponse)
async def query_simulation_attemptss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query simulation_attemptss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying simulation_attemptss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Simulation_attemptsService(db)
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
        logger.debug(f"Found {result['total']} simulation_attemptss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying simulation_attemptss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Simulation_attemptsListResponse)
async def query_simulation_attemptss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query simulation_attemptss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying simulation_attemptss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Simulation_attemptsService(db)
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
        logger.debug(f"Found {result['total']} simulation_attemptss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying simulation_attemptss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Simulation_attemptsResponse)
async def get_simulation_attempts(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single simulation_attempts by ID (user can only see their own records)"""
    logger.debug(f"Fetching simulation_attempts with id: {id}, fields={fields}")
    
    service = Simulation_attemptsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Simulation_attempts with id {id} not found")
            raise HTTPException(status_code=404, detail="Simulation_attempts not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching simulation_attempts {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Simulation_attemptsResponse, status_code=201)
async def create_simulation_attempts(
    data: Simulation_attemptsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new simulation_attempts"""
    logger.debug(f"Creating new simulation_attempts with data: {data}")
    
    service = Simulation_attemptsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create simulation_attempts")
        
        logger.info(f"Simulation_attempts created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating simulation_attempts: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating simulation_attempts: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Simulation_attemptsResponse], status_code=201)
async def create_simulation_attemptss_batch(
    request: Simulation_attemptsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple simulation_attemptss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} simulation_attemptss")
    
    service = Simulation_attemptsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} simulation_attemptss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Simulation_attemptsResponse])
async def update_simulation_attemptss_batch(
    request: Simulation_attemptsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple simulation_attemptss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} simulation_attemptss")
    
    service = Simulation_attemptsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} simulation_attemptss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Simulation_attemptsResponse)
async def update_simulation_attempts(
    id: int,
    data: Simulation_attemptsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing simulation_attempts (requires ownership)"""
    logger.debug(f"Updating simulation_attempts {id} with data: {data}")

    service = Simulation_attemptsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Simulation_attempts with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Simulation_attempts not found")
        
        logger.info(f"Simulation_attempts {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating simulation_attempts {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating simulation_attempts {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_simulation_attemptss_batch(
    request: Simulation_attemptsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple simulation_attemptss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} simulation_attemptss")
    
    service = Simulation_attemptsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} simulation_attemptss successfully")
        return {"message": f"Successfully deleted {deleted_count} simulation_attemptss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_simulation_attempts(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single simulation_attempts by ID (requires ownership)"""
    logger.debug(f"Deleting simulation_attempts with id: {id}")
    
    service = Simulation_attemptsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Simulation_attempts with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Simulation_attempts not found")
        
        logger.info(f"Simulation_attempts {id} deleted successfully")
        return {"message": "Simulation_attempts deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting simulation_attempts {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")