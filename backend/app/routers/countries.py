"""
Countries Router
Handles country management operations
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.connection import get_db
from app.models.models import User, Country
from app.services.auth_service import AuthService, get_current_user, get_current_superuser
from app.schemas.country_schemas import CountryCreate, CountryUpdate, CountryResponse

router = APIRouter()
auth_service = AuthService()


@router.get("/", response_model=List[CountryResponse])
async def get_countries(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all countries (ordered by name)
    """
    countries = db.query(Country).order_by(Country.name).all()
    return [CountryResponse.from_orm(country) for country in countries]


@router.post("/", response_model=CountryResponse)
async def create_country(
    country_data: CountryCreate,
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """
    Create a new country (superuser only)
    """
    try:
        # Check if country name already exists
        existing_country = db.query(Country).filter(Country.name == country_data.name).first()
        if existing_country:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Country name already exists"
            )
        
        # Create country
        db_country = Country(name=country_data.name)
        
        db.add(db_country)
        db.commit()
        db.refresh(db_country)
        
        return CountryResponse.from_orm(db_country)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create country: {str(e)}"
        )


@router.get("/{country_id}", response_model=CountryResponse)
async def get_country(
    country_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific country
    """
    country = db.query(Country).filter(Country.id == country_id).first()
    if not country:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Country not found"
        )
    
    return CountryResponse.from_orm(country)


@router.put("/{country_id}", response_model=CountryResponse)
async def update_country(
    country_id: int,
    country_data: CountryUpdate,
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """
    Update a country (superuser only)
    """
    country = db.query(Country).filter(Country.id == country_id).first()
    if not country:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Country not found"
        )
    
    try:
        # Update fields that are provided
        update_data = country_data.dict(exclude_unset=True)
        
        # Check name uniqueness if name is being updated
        if "name" in update_data and update_data["name"] != country.name:
            existing_country = db.query(Country).filter(
                Country.name == update_data["name"],
                Country.id != country_id
            ).first()
            if existing_country:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Country name already exists"
                )
        
        # Update country
        for field, value in update_data.items():
            setattr(country, field, value)
        
        db.commit()
        db.refresh(country)
        
        return CountryResponse.from_orm(country)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update country: {str(e)}"
        )


@router.delete("/{country_id}")
async def delete_country(
    country_id: int,
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """
    Delete a country (superuser only)
    """
    country = db.query(Country).filter(Country.id == country_id).first()
    if not country:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Country not found"
        )
    
    # Check if country has associated records
    if country.users or country.prepayments or country.expenses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete country with associated records"
        )
    
    try:
        db.delete(country)
        db.commit()
        return {"message": "Country deleted successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete country: {str(e)}"
        )
