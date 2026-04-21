"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-04-20

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tabs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "user_email",
            sa.String(255),
            nullable=False,
            server_default="lokal@entwickler.de",
        ),
    )

    op.create_table(
        "groups",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "tab_id",
            sa.Integer(),
            sa.ForeignKey("tabs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("color", sa.String(20), nullable=False),
        sa.Column("value", sa.Numeric(10, 2), nullable=True),
    )

    op.create_table(
        "postcode_assignments",
        sa.Column(
            "tab_id",
            sa.Integer(),
            sa.ForeignKey("tabs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("postcode", sa.String(5), nullable=False),
        sa.Column(
            "group_id",
            sa.Integer(),
            sa.ForeignKey("groups.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("tab_id", "postcode"),
    )

    op.create_table(
        "postcode_values",
        sa.Column("postcode", sa.String(5), primary_key=True),
        sa.Column("value", sa.Numeric(10, 2), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("postcode_values")
    op.drop_table("postcode_assignments")
    op.drop_table("groups")
    op.drop_table("tabs")
