from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.category import (
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
    SubcategoryCreate,
    SubcategoryUpdate,
    SubcategoryResponse,
)
from app.services.auth import get_current_user
from app.services.household import get_user_household
from app.models import User, Category, Subcategory

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=list[CategoryResponse])
def list_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """카테고리 목록 조회 (소분류 포함)"""
    household = get_user_household(db, current_user.id)
    household_id = household.id if household else None

    categories = (
        db.query(Category)
        .filter(
            (Category.household_id == None) | (Category.household_id == household_id)
        )
        .order_by(Category.type, Category.sort_order)
        .all()
    )

    return categories


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    category_data: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """새 카테고리 생성"""
    household = get_user_household(db, current_user.id)
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't belong to any household",
        )

    # Check if category with same name already exists
    existing = (
        db.query(Category)
        .filter(
            Category.name == category_data.name,
            Category.type == category_data.type,
            (Category.household_id == None) | (Category.household_id == household.id),
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this name already exists",
        )

    # Get max sort_order
    max_order = (
        db.query(Category)
        .filter(
            Category.type == category_data.type,
            (Category.household_id == None) | (Category.household_id == household.id),
        )
        .count()
    )

    category = Category(
        household_id=household.id,
        name=category_data.name,
        type=category_data.type,
        color=category_data.color,
        icon=category_data.icon,
        sort_order=max_order,
    )
    db.add(category)
    db.commit()
    db.refresh(category)

    return category


@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: UUID,
    category_data: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """카테고리 수정"""
    household = get_user_household(db, current_user.id)
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't belong to any household",
        )

    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    # 기본 카테고리는 수정 불가
    if category.household_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify default categories",
        )

    # 본인 가구 카테고리만 수정 가능
    if category.household_id != household.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify other household's categories",
        )

    update_data = category_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)

    db.commit()
    db.refresh(category)

    return category


@router.delete("/{category_id}")
def delete_category(
    category_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """카테고리 삭제"""
    household = get_user_household(db, current_user.id)
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't belong to any household",
        )

    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    # 기본 카테고리는 삭제 불가
    if category.household_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete default categories",
        )

    # 본인 가구 카테고리만 삭제 가능
    if category.household_id != household.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete other household's categories",
        )

    db.delete(category)
    db.commit()

    return {"message": "Category deleted"}


# Subcategory endpoints
@router.post("/{category_id}/subcategories", response_model=SubcategoryResponse, status_code=status.HTTP_201_CREATED)
def create_subcategory(
    category_id: UUID,
    subcategory_data: SubcategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """소분류 생성"""
    household = get_user_household(db, current_user.id)
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't belong to any household",
        )

    # 카테고리 확인
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    # 접근 권한 확인
    if category.household_id is not None and category.household_id != household.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify other household's categories",
        )

    # 중복 확인
    existing = (
        db.query(Subcategory)
        .filter(
            Subcategory.category_id == category_id,
            Subcategory.name == subcategory_data.name,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subcategory with this name already exists",
        )

    # Get max sort_order
    max_order = db.query(Subcategory).filter(Subcategory.category_id == category_id).count()

    subcategory = Subcategory(
        category_id=category_id,
        name=subcategory_data.name,
        sort_order=max_order,
    )
    db.add(subcategory)
    db.commit()
    db.refresh(subcategory)

    return subcategory


@router.put("/subcategories/{subcategory_id}", response_model=SubcategoryResponse)
def update_subcategory(
    subcategory_id: UUID,
    subcategory_data: SubcategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """소분류 수정"""
    household = get_user_household(db, current_user.id)
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't belong to any household",
        )

    subcategory = db.query(Subcategory).filter(Subcategory.id == subcategory_id).first()
    if not subcategory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subcategory not found",
        )

    # 카테고리 접근 권한 확인
    category = subcategory.category
    if category.household_id is not None and category.household_id != household.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify other household's subcategories",
        )

    update_data = subcategory_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(subcategory, field, value)

    db.commit()
    db.refresh(subcategory)

    return subcategory


@router.delete("/subcategories/{subcategory_id}")
def delete_subcategory(
    subcategory_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """소분류 삭제"""
    household = get_user_household(db, current_user.id)
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't belong to any household",
        )

    subcategory = db.query(Subcategory).filter(Subcategory.id == subcategory_id).first()
    if not subcategory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subcategory not found",
        )

    # 카테고리 접근 권한 확인
    category = subcategory.category
    if category.household_id is not None and category.household_id != household.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete other household's subcategories",
        )

    db.delete(subcategory)
    db.commit()

    return {"message": "Subcategory deleted"}
