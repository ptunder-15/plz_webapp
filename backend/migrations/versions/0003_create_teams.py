"""create teams and team_members

Revision ID: 0003
Revises: 0002
Create Date: 2026-04-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "teams",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        "team_members",
        sa.Column(
            "team_id",
            sa.Integer(),
            sa.ForeignKey("teams.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_email", sa.String(255), nullable=False),
        # role: admin | editor | viewer
        sa.Column("role", sa.String(20), nullable=False, server_default="editor"),
        sa.Column("invited_by", sa.String(255), nullable=True),
        sa.Column("joined_at", sa.DateTime(), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("team_id", "user_email"),
    )


def downgrade() -> None:
    op.drop_table("team_members")
    op.drop_table("teams")
