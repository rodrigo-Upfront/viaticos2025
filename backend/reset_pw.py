from app.database.connection import SessionLocal
from app.models.models import User
from app.services.auth_service import AuthService

db = SessionLocal()
user = db.query(User).filter(User.email=="test@test.com").first()
if user:
    user.password = AuthService().get_password_hash("admin123")
    user.force_password_change = False
    db.commit()
    print("updated")
else:
    print("user not found")
