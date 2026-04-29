"""tab_members: per-tab access control

Revision ID: 0006
Revises: 0005
Create Date: 2026-04-29
"""
from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade():
    # 1. owner_email column on tabs
    op.add_column("tabs", sa.Column("owner_email", sa.String(255), nullable=True))

    # 2. Populate owner_email from the team's admin member
    op.execute("""
        UPDATE tabs t
        SET owner_email = (
            SELECT tm.user_email
            FROM team_members tm
            WHERE tm.team_id = t.team_id AND tm.role = 'admin'
            ORDER BY tm.joined_at
            LIMIT 1
        )
    """)

    # 3. New tab_members table
    op.create_table(
        "tab_members",
        sa.Column("tab_id", sa.Integer(), sa.ForeignKey("tabs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_email", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="editor"),
        sa.Column("invited_by", sa.String(255), nullable=True),
        sa.Column("joined_at", sa.DateTime(), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("tab_id", "user_email"),
    )

    # 4. Migrate existing non-admin team members → tab_members for all their tabs
    op.execute("""
        INSERT INTO tab_members (tab_id, user_email, role, invited_by)
        SELECT t.id, tm.user_email, tm.role, tm.invited_by
        FROM tabs t
        JOIN team_members tm ON tm.team_id = t.team_id
        WHERE tm.role != 'admin'
        ON CONFLICT (tab_id, user_email) DO NOTHING
    """)

    # 5. Add tab_id column to invite_tokens (replaces team_id for new invites)
    op.add_column(
        "invite_tokens",
        sa.Column("tab_id", sa.Integer(), sa.ForeignKey("tabs.id", ondelete="CASCADE"), nullable=True),
    )


def downgrade():
    op.drop_column("invite_tokens", "tab_id")
    op.drop_table("tab_members")
    op.drop_column("tabs", "owner_email")
