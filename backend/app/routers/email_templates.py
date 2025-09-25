from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.connection import get_db
from app.models.models import User, UserProfile, EmailTemplate, EmailEventType, LanguageCode
from app.schemas.email_schemas import (
    EmailTemplateResponse, 
    EmailTemplateCreate, 
    EmailTemplateUpdate,
    TemplateVariableGroup
)
from app.services.template_service import TemplateService
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/email-templates", tags=["Email Templates"])

def require_superuser(current_user: User = Depends(get_current_user)):
    """Dependency to ensure only superusers can access email template management"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to email template management is restricted to superusers"
        )
    return current_user

@router.get("/", response_model=List[EmailTemplateResponse])
def get_email_templates(
    event_type: Optional[EmailEventType] = None,
    language: Optional[LanguageCode] = None,
    enabled: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser)
):
    """
    Get all email templates with optional filtering
    """
    query = db.query(EmailTemplate)
    
    if event_type:
        query = query.filter(EmailTemplate.event_type == event_type.value)
    if language:
        query = query.filter(EmailTemplate.language == language.value)
    if enabled is not None:
        query = query.filter(EmailTemplate.enabled == enabled)
    
    templates = query.order_by(EmailTemplate.event_type, EmailTemplate.language).all()
    return templates

@router.get("/{template_id}", response_model=EmailTemplateResponse)
def get_email_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser)
):
    """
    Get a specific email template by ID
    """
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email template not found"
        )
    return template

@router.post("/", response_model=EmailTemplateResponse)
def create_email_template(
    template_data: EmailTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser)
):
    """
    Create a new email template
    """
    # Check if template already exists for this event_type and language
    existing = db.query(EmailTemplate).filter(
        EmailTemplate.event_type == template_data.event_type.value,
        EmailTemplate.language == template_data.language.value
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Template for event '{template_data.event_type.value}' in language '{template_data.language.value}' already exists"
        )
    
    template = EmailTemplate(
        event_type=template_data.event_type.value,
        language=template_data.language.value,
        subject_template=template_data.subject_template,
        body_template=template_data.body_template,
        enabled=template_data.enabled
    )
    
    db.add(template)
    db.commit()
    db.refresh(template)
    
    return template

@router.put("/{template_id}", response_model=EmailTemplateResponse)
def update_email_template(
    template_id: int,
    template_update: EmailTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser)
):
    """
    Update an existing email template
    """
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email template not found"
        )
    
    # Update fields if provided
    if template_update.subject_template is not None:
        template.subject_template = template_update.subject_template
    if template_update.body_template is not None:
        template.body_template = template_update.body_template
    if template_update.enabled is not None:
        template.enabled = template_update.enabled
    
    db.commit()
    db.refresh(template)
    
    return template

@router.delete("/{template_id}")
def delete_email_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser)
):
    """
    Delete an email template
    """
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email template not found"
        )
    
    db.delete(template)
    db.commit()
    
    return {"message": "Email template deleted successfully"}

@router.get("/variables/available", response_model=List[TemplateVariableGroup])
def get_available_template_variables(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser)
):
    """
    Get list of available template variables for the editor
    """
    template_service = TemplateService(db)
    return template_service.get_available_variables()

@router.post("/validate")
def validate_template_syntax(
    template_content: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser)
):
    """
    Validate template syntax and check for undefined variables
    """
    if "content" not in template_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Template content is required"
        )
    
    template_service = TemplateService(db)
    validation_result = template_service.validate_template(template_content["content"])
    
    return validation_result

@router.post("/preview")
def preview_template(
    preview_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser)
):
    """
    Preview template with sample data
    """
    if "template" not in preview_data or "sample_data" not in preview_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Template and sample_data are required"
        )
    
    template_service = TemplateService(db)
    
    try:
        rendered_content = template_service.render_template(
            preview_data["template"],
            preview_data["sample_data"]
        )
        return {"rendered_content": rendered_content}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Template rendering error: {str(e)}"
        )

@router.get("/events/types")
def get_email_event_types(
    current_user: User = Depends(require_superuser)
):
    """
    Get list of available email event types
    """
    return [
        {
            "value": event.value,
            "label": event.value.replace("_", " ").title(),
            "description": _get_event_description(event)
        }
        for event in EmailEventType
    ]

def _get_event_description(event: EmailEventType) -> str:
    """Helper function to get human-readable event descriptions"""
    descriptions = {
        EmailEventType.PREPAYMENT_PENDING: "Sent to approvers when a prepayment is submitted for approval",
        EmailEventType.PREPAYMENT_APPROVED: "Sent to requester when their prepayment is approved",
        EmailEventType.PREPAYMENT_REJECTED: "Sent to requester when their prepayment is rejected",
        EmailEventType.CREDIT_CARD_STATEMENT_CREATED: "Sent to treasury when a credit card statement is uploaded",
        EmailEventType.REPORT_PENDING: "Sent to approvers when an expense report is submitted",
        EmailEventType.REPORT_APPROVED_100: "Sent to requester when their expense report is fully approved",
        EmailEventType.REPORT_REIMBURSEMENT_HIGHER_TREASURY: "Sent to treasury for higher reimbursement amounts",
        EmailEventType.REPORT_REIMBURSEMENT_HIGHER_USER: "Sent to user confirming higher reimbursement",
        EmailEventType.REPORT_REIMBURSEMENT_LOWER_USER: "Sent to user about lower reimbursement amount",
        EmailEventType.REPORT_REIMBURSEMENT_LOWER_TREASURY: "Sent to treasury for refund processing",
        EmailEventType.REPORT_REIMBURSEMENT_LOWER_CONFIRMED: "Sent to user confirming refund validation",
        EmailEventType.REPORT_REJECTED: "Sent to requester when their expense report is rejected",
        EmailEventType.REPORT_REJECTED_EXPENSES: "Sent to requester when report is rejected due to expense issues"
    }
    return descriptions.get(event, "Email notification for " + event.value.replace("_", " "))
