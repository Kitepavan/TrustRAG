"""
TrustRAG — Stage 10 Auth & RBAC Unit Tests
"""

import pytest
from backend.security.auth import (
    authenticate_user,
    create_jwt_token,
    decode_jwt_token,
    check_rbac_permission,
)


def test_authentication_and_jwt():
    # Valid login
    user = authenticate_user("hr_user", "hr123")
    assert user is not None
    assert user["role"] == "HR"

    # Invalid password
    assert authenticate_user("hr_user", "wrong_pass") is None

    # JWT generation & decoding
    token = create_jwt_token({"username": user["username"], "role": user["role"]})
    decoded = decode_jwt_token(token)
    assert decoded is not None
    assert decoded["username"] == "hr_user"
    assert decoded["role"] == "HR"

    # Corrupt token
    assert decode_jwt_token("bad.jwt.token") is None


def test_rbac_permission_checks():
    emp_tags = ["PUBLIC", "INTERNAL"]
    hr_tags = ["PUBLIC", "INTERNAL", "HR_CONFIDENTIAL"]

    # Employee checking public and internal docs
    assert check_rbac_permission(emp_tags, "PUBLIC") is True
    assert check_rbac_permission(emp_tags, "INTERNAL") is True

    # Employee attempting HR confidential doc
    assert check_rbac_permission(emp_tags, "HR_CONFIDENTIAL") is False

    # HR Specialist checking HR confidential doc
    assert check_rbac_permission(hr_tags, "HR_CONFIDENTIAL") is True
