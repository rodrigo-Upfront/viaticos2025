import re
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.models.models import EmailTemplate, LanguageCode
from app.schemas.email_schemas import TemplateVariable, TemplateVariableGroup

class TemplateService:
    def __init__(self, db: Session):
        self.db = db
    
    def render_template(
        self, 
        template_content: str, 
        context: Dict[str, Any],
        app_url: str = "http://localhost:3000"
    ) -> str:
        """
        Render a template by replacing variables with actual values
        Variables format: {object.field} or {field}
        """
        # Add system variables to context
        if "system" not in context:
            context["system"] = {}
        context["system"]["app_url"] = app_url
        
        # Find all template variables
        variable_pattern = r'\{([^}]+)\}'
        variables = re.findall(variable_pattern, template_content)
        
        rendered_content = template_content
        
        for variable in variables:
            value = self._get_nested_value(context, variable)
            if value is not None:
                rendered_content = rendered_content.replace(f"{{{variable}}}", str(value))
            else:
                # Keep placeholder if value not found
                rendered_content = rendered_content.replace(f"{{{variable}}}", f"[{variable}]")
        
        return rendered_content
    
    def _get_nested_value(self, data: Dict[str, Any], key_path: str) -> Any:
        """
        Get nested value from dictionary using dot notation
        Example: "user.name" -> data["user"]["name"]
        """
        try:
            keys = key_path.split('.')
            value = data
            
            for key in keys:
                if isinstance(value, dict) and key in value:
                    value = value[key]
                elif hasattr(value, key):
                    value = getattr(value, key)
                else:
                    return None
            
            return value
        except (KeyError, AttributeError, TypeError):
            return None
    
    def get_template(
        self, 
        event_type: str, 
        language: LanguageCode = LanguageCode.SPANISH
    ) -> Optional[EmailTemplate]:
        """
        Get email template for specific event and language
        """
        return self.db.query(EmailTemplate).filter(
            EmailTemplate.event_type == event_type,
            EmailTemplate.language == language,
            EmailTemplate.enabled == True
        ).first()
    
    def render_email_template(
        self,
        event_type: str,
        context: Dict[str, Any],
        language: LanguageCode = LanguageCode.SPANISH,
        app_url: str = "http://localhost:3000"
    ) -> tuple[Optional[str], Optional[str]]:
        """
        Render both subject and body for an email template
        Returns: (subject, body) or (None, None) if template not found
        """
        template = self.get_template(event_type, language)
        if not template:
            return None, None
        
        subject = self.render_template(template.subject_template, context, app_url)
        body = self.render_template(template.body_template, context, app_url)
        
        return subject, body
    
    def get_available_variables(self) -> List[TemplateVariableGroup]:
        """
        Get list of available template variables for the frontend editor
        """
        variable_groups = [
            TemplateVariableGroup(
                category="user",
                variables=[
                    TemplateVariable(key="user.name", description="User's full name", category="user"),
                    TemplateVariable(key="user.email", description="User's email address", category="user"),
                    TemplateVariable(key="user.department", description="User's department", category="user"),
                    TemplateVariable(key="user.profile", description="User's profile/role", category="user"),
                ]
            ),
            TemplateVariableGroup(
                category="prepayment",
                variables=[
                    TemplateVariable(key="prepayment.id", description="Prepayment ID", category="prepayment"),
                    TemplateVariable(key="prepayment.reason", description="Prepayment reason", category="prepayment"),
                    TemplateVariable(key="prepayment.amount", description="Prepayment amount", category="prepayment"),
                    TemplateVariable(key="prepayment.currency", description="Prepayment currency", category="prepayment"),
                    TemplateVariable(key="prepayment.destination", description="Travel destination", category="prepayment"),
                    TemplateVariable(key="prepayment.requester.name", description="Requester's name", category="prepayment"),
                    TemplateVariable(key="prepayment.requester.email", description="Requester's email", category="prepayment"),
                    TemplateVariable(key="prepayment.rejection_reason", description="Rejection reason", category="prepayment"),
                    TemplateVariable(key="prepayment.start_date", description="Trip start date", category="prepayment"),
                    TemplateVariable(key="prepayment.end_date", description="Trip end date", category="prepayment"),
                ]
            ),
            TemplateVariableGroup(
                category="report",
                variables=[
                    TemplateVariable(key="report.id", description="Report ID", category="report"),
                    TemplateVariable(key="report.reason", description="Report reason", category="report"),
                    TemplateVariable(key="report.total_expenses", description="Total expenses amount", category="report"),
                    TemplateVariable(key="report.currency", description="Report currency", category="report"),
                    TemplateVariable(key="report.requester.name", description="Report requester's name", category="report"),
                    TemplateVariable(key="report.requester.email", description="Report requester's email", category="report"),
                    TemplateVariable(key="report.prepaid_amount", description="Prepaid amount", category="report"),
                    TemplateVariable(key="report.reimbursement_amount", description="Reimbursement amount", category="report"),
                    TemplateVariable(key="report.rejection_reason", description="Rejection reason", category="report"),
                ]
            ),
            TemplateVariableGroup(
                category="statement",
                variables=[
                    TemplateVariable(key="statement.id", description="Statement ID", category="statement"),
                    TemplateVariable(key="statement.filename", description="Statement filename", category="statement"),
                    TemplateVariable(key="statement.period", description="Statement period", category="statement"),
                    TemplateVariable(key="statement.record_count", description="Number of records", category="statement"),
                    TemplateVariable(key="statement.uploaded_by", description="Uploaded by user", category="statement"),
                ]
            ),
            TemplateVariableGroup(
                category="system",
                variables=[
                    TemplateVariable(key="system.app_url", description="Application URL", category="system"),
                    TemplateVariable(key="system.date", description="Current date", category="system"),
                    TemplateVariable(key="system.time", description="Current time", category="system"),
                ]
            )
        ]
        
        return variable_groups
    
    def validate_template(self, template_content: str) -> Dict[str, Any]:
        """
        Validate template syntax and find undefined variables
        """
        # Find all variables in template
        variable_pattern = r'\{([^}]+)\}'
        variables = re.findall(variable_pattern, template_content)
        
        # Get available variables
        available_vars = []
        for group in self.get_available_variables():
            available_vars.extend([var.key for var in group.variables])
        
        # Check for undefined variables
        undefined_vars = [var for var in variables if var not in available_vars]
        
        return {
            "is_valid": len(undefined_vars) == 0,
            "variables_found": variables,
            "undefined_variables": undefined_vars,
            "available_variables": available_vars
        }
    
    def create_template_context(
        self,
        prepayment=None,
        report=None,
        statement=None,
        user=None,
        additional_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create template context from model objects
        """
        context = {}
        
        if user:
            context["user"] = {
                "name": getattr(user, 'name', ''),
                "email": getattr(user, 'email', ''),
                "department": getattr(user, 'department', ''),
                "profile": getattr(user, 'profile', ''),
            }
        
        if prepayment:
            context["prepayment"] = {
                "id": getattr(prepayment, 'id', ''),
                "reason": getattr(prepayment, 'reason', ''),
                "amount": getattr(prepayment, 'amount', 0),
                "currency": getattr(prepayment, 'currency', ''),
                "destination": getattr(prepayment, 'destination', ''),
                "rejection_reason": getattr(prepayment, 'rejection_reason', ''),
                "start_date": getattr(prepayment, 'startDate', ''),
                "end_date": getattr(prepayment, 'endDate', ''),
            }
            
            # Add requester info if available
            if hasattr(prepayment, 'requesting_user') and prepayment.requesting_user:
                context["prepayment"]["requester"] = {
                    "name": getattr(prepayment.requesting_user, 'name', ''),
                    "email": getattr(prepayment.requesting_user, 'email', ''),
                }
        
        if report:
            context["report"] = {
                "id": getattr(report, 'id', ''),
                "reason": getattr(report, 'reason', ''),
                "total_expenses": getattr(report, 'total_expenses', 0),
                "currency": getattr(report, 'currency', ''),
                "prepaid_amount": getattr(report, 'prepaid_amount', 0),
                "reimbursement_amount": getattr(report, 'reimbursement_amount', 0),
                "rejection_reason": getattr(report, 'rejection_reason', ''),
            }
            
            # Add requester info if available
            if hasattr(report, 'requesting_user') and report.requesting_user:
                context["report"]["requester"] = {
                    "name": getattr(report.requesting_user, 'name', ''),
                    "email": getattr(report.requesting_user, 'email', ''),
                }
        
        if statement:
            context["statement"] = {
                "id": getattr(statement, 'id', ''),
                "filename": getattr(statement, 'filename', ''),
                "period": getattr(statement, 'period', ''),
                "record_count": getattr(statement, 'record_count', 0),
                "uploaded_by": getattr(statement, 'uploaded_by_name', ''),
            }
        
        # Add additional data
        if additional_data:
            context.update(additional_data)
        
        return context
