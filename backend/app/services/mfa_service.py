"""
MFA (Multi-Factor Authentication) Service
Handles TOTP (Time-based One-Time Password) generation, verification, and backup codes
"""

import pyotp
import qrcode
import secrets
import hashlib
import base64
from io import BytesIO
from typing import List, Tuple, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from cryptography.fernet import Fernet

from app.core.config import settings
from app.models.models import User


class MFAService:
    """Service for handling MFA operations"""
    
    def __init__(self):
        # Create encryption key for secrets (in production, store this securely)
        self.encryption_key = self._get_encryption_key()
        self.cipher = Fernet(self.encryption_key)
    
    def _get_encryption_key(self) -> bytes:
        """Get or generate encryption key for MFA secrets"""
        # In production, this should be stored securely (env var, key management system)
        # For now, derive from JWT secret for consistency
        key_material = settings.JWT_SECRET_KEY.encode('utf-8')
        # Create a proper Fernet key from the JWT secret
        key = base64.urlsafe_b64encode(hashlib.sha256(key_material).digest())
        return key
    
    def generate_secret(self) -> str:
        """Generate a new TOTP secret"""
        return pyotp.random_base32()
    
    def generate_qr_code(self, user_email: str, secret: str, issuer: str = "Viaticos 2025") -> str:
        """Generate QR code for authenticator app setup"""
        # Create the TOTP URI
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=user_email,
            issuer_name=issuer
        )
        
        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(totp_uri)
        qr.make(fit=True)
        
        # Create QR code image
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64 string
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
    
    def verify_totp(self, secret: str, token: str, window: int = 1) -> bool:
        """Verify TOTP token"""
        try:
            totp = pyotp.TOTP(secret)
            return totp.verify(token, valid_window=window)
        except Exception:
            return False
    
    def generate_backup_codes(self, count: int = 8) -> List[str]:
        """Generate backup codes for MFA recovery"""
        codes = []
        for _ in range(count):
            # Generate 8-character alphanumeric code
            code = ''.join(secrets.choice('ABCDEFGHJKLMNPQRSTUVWXYZ23456789') for _ in range(8))
            codes.append(code)
        return codes
    
    def hash_backup_codes(self, codes: List[str]) -> List[str]:
        """Hash backup codes for secure storage"""
        hashed_codes = []
        for code in codes:
            # Use SHA-256 with salt
            salt = secrets.token_hex(16)
            hashed = hashlib.sha256((code + salt).encode()).hexdigest()
            hashed_codes.append(f"{salt}:{hashed}")
        return hashed_codes
    
    def verify_backup_code(self, stored_codes: List[str], provided_code: str) -> Tuple[bool, List[str]]:
        """
        Verify backup code and remove it from the list (one-time use)
        Returns (is_valid, updated_codes_list)
        """
        for i, stored_code in enumerate(stored_codes):
            try:
                salt, hashed = stored_code.split(':', 1)
                test_hash = hashlib.sha256((provided_code.upper() + salt).encode()).hexdigest()
                
                if test_hash == hashed:
                    # Remove the used code
                    updated_codes = stored_codes.copy()
                    updated_codes.pop(i)
                    return True, updated_codes
            except ValueError:
                continue
        
        return False, stored_codes
    
    def encrypt_secret(self, secret: str) -> str:
        """Encrypt MFA secret for database storage"""
        return self.cipher.encrypt(secret.encode()).decode()
    
    def decrypt_secret(self, encrypted_secret: str) -> str:
        """Decrypt MFA secret from database"""
        return self.cipher.decrypt(encrypted_secret.encode()).decode()
    
    def setup_mfa(self, db: Session, user_id: int) -> Tuple[str, str, List[str]]:
        """
        Set up MFA for a user
        Returns (secret, qr_code_base64, backup_codes)
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        # Generate secret and backup codes
        secret = self.generate_secret()
        qr_code = self.generate_qr_code(user.email, secret)
        backup_codes = self.generate_backup_codes()
        
        # Don't enable MFA yet - user must verify setup first
        # Just return the data for verification
        return secret, qr_code, backup_codes
    
    def enable_mfa(self, db: Session, user_id: int, secret: str, backup_codes: List[str]) -> bool:
        """Enable MFA for a user after verification"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        # Encrypt secret and hash backup codes
        encrypted_secret = self.encrypt_secret(secret)
        hashed_backup_codes = self.hash_backup_codes(backup_codes)
        
        # Update user record
        user.mfa_enabled = True
        user.mfa_secret = encrypted_secret
        user.backup_codes = hashed_backup_codes
        user.mfa_last_used = None
        
        db.commit()
        return True
    
    def disable_mfa(self, db: Session, user_id: int) -> bool:
        """Disable MFA for a user"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        user.mfa_enabled = False
        user.mfa_secret = None
        user.backup_codes = None
        user.mfa_last_used = None
        
        db.commit()
        return True
    
    def verify_user_mfa(self, db: Session, user_id: int, token: str) -> bool:
        """Verify MFA token for a user"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.mfa_enabled or not user.mfa_secret:
            return False
        
        try:
            # Decrypt secret
            secret = self.decrypt_secret(user.mfa_secret)
            
            # Check if it's a TOTP token
            if self.verify_totp(secret, token):
                # Update last used timestamp
                user.mfa_last_used = datetime.utcnow()
                db.commit()
                return True
            
            # Check if it's a backup code
            if user.backup_codes:
                is_valid, updated_codes = self.verify_backup_code(user.backup_codes, token)
                if is_valid:
                    user.backup_codes = updated_codes
                    user.mfa_last_used = datetime.utcnow()
                    db.commit()
                    return True
            
            return False
            
        except Exception as e:
            print(f"MFA verification error: {e}")
            return False
    
    def regenerate_backup_codes(self, db: Session, user_id: int) -> Optional[List[str]]:
        """Regenerate backup codes for a user"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.mfa_enabled:
            return None
        
        # Generate new backup codes
        new_codes = self.generate_backup_codes()
        hashed_codes = self.hash_backup_codes(new_codes)
        
        # Update user record
        user.backup_codes = hashed_codes
        db.commit()
        
        return new_codes

