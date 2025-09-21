"""
API routes for Location and LocationCurrency management
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional

from ..database.connection import get_db
from ..models.models import Location, LocationCurrency, Currency, ExpenseCategory
from ..schemas.location_schemas import (
    Location as LocationSchema,
    LocationCreate,
    LocationUpdate,
    LocationWithCurrencies,
    LocationList,
    LocationCurrency as LocationCurrencySchema,
    LocationCurrencyCreate,
    LocationCurrencyUpdate,
    LocationCurrencyWithDetails
)
from ..schemas.category_schemas import (
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse
)
from ..services.auth_service import get_current_user, get_current_superuser

router = APIRouter(prefix="/locations", tags=["locations"])


@router.get("/", response_model=LocationList)
async def get_locations(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(10, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by name, SAP code, or cost center"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_superuser)
):
    """Get all locations with pagination and optional search"""
    
    query = db.query(Location)
    
    # Apply search filter if provided
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Location.name.ilike(search_term),
                Location.sap_code.ilike(search_term),
                Location.cost_center.ilike(search_term)
            )
        )
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    locations = query.offset((page - 1) * per_page).limit(per_page).all()
    
    # Calculate pagination info
    pages = (total + per_page - 1) // per_page
    
    return LocationList(
        locations=locations,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages
    )


@router.get("/{location_id}", response_model=LocationWithCurrencies)
async def get_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_superuser)
):
    """Get a specific location with its currencies"""
    
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )
    
    # Get location currencies with currency details
    location_currencies_query = db.query(
        LocationCurrency,
        Currency.code.label('currency_code'),
        Currency.name.label('currency_name')
    ).join(
        Currency, LocationCurrency.currency_id == Currency.id
    ).filter(
        LocationCurrency.location_id == location_id
    )
    
    location_currencies_data = location_currencies_query.all()
    
    location_currencies = []
    for loc_curr, currency_code, currency_name in location_currencies_data:
        currency_dict = {
            "id": loc_curr.id,
            "location_id": loc_curr.location_id,
            "currency_id": loc_curr.currency_id,
            "account": loc_curr.account,
            "created_at": loc_curr.created_at,
            "updated_at": loc_curr.updated_at,
            "currency_code": currency_code,
            "currency_name": currency_name
        }
        location_currencies.append(LocationCurrencyWithDetails(**currency_dict))
    
    # Create response with currencies
    location_dict = {
        "id": location.id,
        "name": location.name,
        "sap_code": location.sap_code,
        "cost_center": location.cost_center,
        "created_at": location.created_at,
        "updated_at": location.updated_at,
        "location_currencies": location_currencies
    }
    
    return LocationWithCurrencies(**location_dict)


@router.post("/", response_model=LocationSchema)
async def create_location(
    location_data: LocationCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_superuser)
):
    """Create a new location"""
    
    # Check if SAP code already exists
    existing_location = db.query(Location).filter(
        Location.sap_code == location_data.sap_code.upper()
    ).first()
    
    if existing_location:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Location with SAP code '{location_data.sap_code}' already exists"
        )
    
    # Create the location
    db_location = Location(**location_data.dict())
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    
    return db_location


@router.put("/{location_id}", response_model=LocationSchema)
async def update_location(
    location_id: int,
    location_data: LocationUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_superuser)
):
    """Update a location"""
    
    db_location = db.query(Location).filter(Location.id == location_id).first()
    if not db_location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )
    
    # Check if SAP code already exists (for a different location)
    if location_data.sap_code:
        existing_location = db.query(Location).filter(
            and_(
                Location.sap_code == location_data.sap_code.upper(),
                Location.id != location_id
            )
        ).first()
        
        if existing_location:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Location with SAP code '{location_data.sap_code}' already exists"
            )
    
    # Update only provided fields
    update_data = location_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_location, field, value)
    
    db.commit()
    db.refresh(db_location)
    
    return db_location


@router.delete("/{location_id}")
async def delete_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_superuser)
):
    """Delete a location and all its associated currencies"""
    
    db_location = db.query(Location).filter(Location.id == location_id).first()
    if not db_location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )
    
    db.delete(db_location)
    db.commit()
    
    return {"message": "Location deleted successfully"}


# Location Currency endpoints
@router.post("/{location_id}/currencies", response_model=LocationCurrencySchema)
async def add_location_currency(
    location_id: int,
    currency_data: LocationCurrencyCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_superuser)
):
    """Add a currency to a location"""
    
    # Verify location exists
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )
    
    # Verify currency exists
    currency = db.query(Currency).filter(Currency.id == currency_data.currency_id).first()
    if not currency:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Currency not found"
        )
    
    # Check if combination already exists
    existing_combination = db.query(LocationCurrency).filter(
        and_(
            LocationCurrency.location_id == location_id,
            LocationCurrency.currency_id == currency_data.currency_id
        )
    ).first()
    
    if existing_combination:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This currency is already associated with this location"
        )
    
    # Create the location currency
    db_location_currency = LocationCurrency(
        location_id=location_id,
        **currency_data.dict()
    )
    db.add(db_location_currency)
    db.commit()
    db.refresh(db_location_currency)
    
    return db_location_currency


@router.put("/{location_id}/currencies/{currency_id}", response_model=LocationCurrencySchema)
async def update_location_currency(
    location_id: int,
    currency_id: int,
    currency_data: LocationCurrencyUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_superuser)
):
    """Update a location currency association"""
    
    db_location_currency = db.query(LocationCurrency).filter(
        and_(
            LocationCurrency.location_id == location_id,
            LocationCurrency.currency_id == currency_id
        )
    ).first()
    
    if not db_location_currency:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location currency association not found"
        )
    
    # Update only provided fields
    update_data = currency_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_location_currency, field, value)
    
    db.commit()
    db.refresh(db_location_currency)
    
    return db_location_currency


@router.delete("/{location_id}/currencies/{currency_id}")
async def remove_location_currency(
    location_id: int,
    currency_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_superuser)
):
    """Remove a currency from a location"""
    
    db_location_currency = db.query(LocationCurrency).filter(
        and_(
            LocationCurrency.location_id == location_id,
            LocationCurrency.currency_id == currency_id
        )
    ).first()
    
    if not db_location_currency:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location currency association not found"
        )
    
    db.delete(db_location_currency)
    db.commit()
    
    return {"message": "Currency removed from location successfully"}


@router.get("/{location_id}/currencies", response_model=List[LocationCurrencyWithDetails])
async def get_location_currencies(
    location_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_superuser)
):
    """Get all currencies for a specific location"""
    
    # Verify location exists
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )
    
    # Get location currencies with currency details
    results = db.query(
        LocationCurrency,
        Currency.code.label('currency_code'),
        Currency.name.label('currency_name')
    ).join(
        Currency, LocationCurrency.currency_id == Currency.id
    ).filter(
        LocationCurrency.location_id == location_id
    ).all()
    
    location_currencies = []
    for loc_curr, currency_code, currency_name in results:
        currency_dict = {
            "id": loc_curr.id,
            "location_id": loc_curr.location_id,
            "currency_id": loc_curr.currency_id,
            "account": loc_curr.account,
            "created_at": loc_curr.created_at,
            "updated_at": loc_curr.updated_at,
            "currency_code": currency_code,
            "currency_name": currency_name
        }
        location_currencies.append(LocationCurrencyWithDetails(**currency_dict))
    
    return location_currencies


# Location Categories Management

@router.get("/{location_id}/categories", response_model=List[CategoryResponse])
async def get_location_categories(
    location_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_superuser)
):
    """Get all categories for a specific location"""
    
    # Verify location exists
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )
    
    # Get categories for this location
    categories = db.query(ExpenseCategory).filter(
        ExpenseCategory.location_id == location_id
    ).order_by(ExpenseCategory.name).all()
    
    return [CategoryResponse.from_orm(category) for category in categories]


@router.post("/{location_id}/categories", response_model=CategoryResponse)
async def add_location_category(
    location_id: int,
    category_data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_superuser)
):
    """Add a new category to a location"""
    
    # Verify location exists
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )
    
    # Check if category name already exists for this location
    existing_category = db.query(ExpenseCategory).filter(
        and_(
            ExpenseCategory.location_id == location_id,
            ExpenseCategory.name == category_data.name
        )
    ).first()
    
    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category '{category_data.name}' already exists for this location"
        )
    
    # Create new category
    db_category = ExpenseCategory(
        name=category_data.name,
        account=category_data.account,
        location_id=location_id
    )
    
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    
    return CategoryResponse.from_orm(db_category)


@router.put("/{location_id}/categories/{category_id}", response_model=CategoryResponse)
async def update_location_category(
    location_id: int,
    category_id: int,
    category_data: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_superuser)
):
    """Update a category within a location"""
    
    # Find the category
    category = db.query(ExpenseCategory).filter(
        and_(
            ExpenseCategory.id == category_id,
            ExpenseCategory.location_id == location_id
        )
    ).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found for this location"
        )
    
    # Check name uniqueness if name is being updated
    if category_data.name and category_data.name != category.name:
        existing_category = db.query(ExpenseCategory).filter(
            and_(
                ExpenseCategory.location_id == location_id,
                ExpenseCategory.name == category_data.name,
                ExpenseCategory.id != category_id
            )
        ).first()
        
        if existing_category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category '{category_data.name}' already exists for this location"
            )
    
    # Update category
    update_data = category_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)
    
    db.commit()
    db.refresh(category)
    
    return CategoryResponse.from_orm(category)


@router.delete("/{location_id}/categories/{category_id}")
async def remove_location_category(
    location_id: int,
    category_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_superuser)
):
    """Remove a category from a location"""
    
    # Find the category
    category = db.query(ExpenseCategory).filter(
        and_(
            ExpenseCategory.id == category_id,
            ExpenseCategory.location_id == location_id
        )
    ).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found for this location"
        )
    
    # Check if category is being used by any expenses
    from ..models.models import Expense
    expenses_using = db.query(Expense).filter(Expense.category_id == category_id).first()
    
    if expenses_using:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category: it is being used by expenses"
        )
    
    db.delete(category)
    db.commit()
    
    return {"message": "Category removed from location successfully"}
