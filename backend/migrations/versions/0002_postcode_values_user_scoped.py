"""postcode_values user scoped

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-20

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. user_email Spalte hinzufügen (bestehende Zeilen bekommen den Dev-Default)
    op.add_column(
        "postcode_values",
        sa.Column(
            "user_email",
            sa.String(255),
            nullable=False,
            server_default="lokal@entwickler.de",
        ),
    )

    # 2. Alten Primary Key (nur postcode) entfernen
    op.drop_constraint("postcode_values_pkey", "postcode_values", type_="primary")

    # 3. Neuen zusammengesetzten Primary Key anlegen
    op.create_primary_key(
        "postcode_values_pkey", "postcode_values", ["user_email", "postcode"]
    )


def downgrade() -> None:
    op.drop_constraint("postcode_values_pkey", "postcode_values", type_="primary")
    op.create_primary_key("postcode_values_pkey", "postcode_values", ["postcode"])
    op.drop_column("postcode_values", "user_email")
