"""Base commune des modèles SQLAlchemy.

Les tables sont définies dans le module de leur domaine : app/auth/models.py,
app/nurseries/models.py.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
