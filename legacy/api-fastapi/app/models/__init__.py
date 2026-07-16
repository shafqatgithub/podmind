"""Public surface of the models package.

Import from here (``from app.models import Project``) rather than from the
individual modules — this keeps refactors of the internal layout invisible
to the rest of the codebase.
"""

from app.models.activity import ActivityEntry, CreditBalance, CreditTransaction
from app.models.chat import (
    ChatMessage,
    ChatMessageCreate,
    ChatSession,
    ChatSessionCreate,
    ChatTurn,
)
from app.models.common import (
    APIError,
    APIErrorEnvelope,
    CursorPage,
    DomainModel,
    OwnedEntity,
    RequestModel,
)
from app.models.enums import (
    AIProvider,
    ChatRole,
    ColorLabel,
    CreditTransactionType,
    NoteType,
    ProjectStatus,
    ResearchStatus,
)
from app.models.library import (
    Folder,
    FolderCreate,
    FolderUpdate,
    Tag,
    TagCreate,
    TagUpdate,
)
from app.models.note import Note, NoteAnchor, NoteCreate, NoteUpdate
from app.models.profile import (
    Profile,
    ProfileUpdate,
    ProviderConfig,
    ProviderConfigUpsert,
)
from app.models.project import (
    Project,
    ProjectCreate,
    ProjectListParams,
    ProjectUpdate,
)
from app.models.research import (
    CONTENT_VERSION,
    ExpertOpinion,
    Myth,
    NewsItem,
    PodcastAngle,
    Reference,
    ResearchContent,
    ResearchCreate,
    ResearchItem,
    ResearchItemSummary,
    ResearchListParams,
    ResearchUpdate,
    Statistic,
    TimelineEvent,
)
from app.models.topic import (
    RelatedTopic,
    TopicAnalysis,
    TopicScores,
    TopicSearchRequest,
    TrendingTopic,
)

__all__ = [
    # enums
    "AIProvider", "ChatRole", "ColorLabel", "CreditTransactionType",
    "NoteType", "ProjectStatus", "ResearchStatus",
    # common
    "APIError", "APIErrorEnvelope", "CursorPage", "DomainModel",
    "OwnedEntity", "RequestModel",
    # profile / providers
    "Profile", "ProfileUpdate", "ProviderConfig", "ProviderConfigUpsert",
    # projects
    "Project", "ProjectCreate", "ProjectListParams", "ProjectUpdate",
    # research
    "CONTENT_VERSION", "ResearchContent", "ResearchCreate", "ResearchItem",
    "ResearchItemSummary", "ResearchListParams", "ResearchUpdate",
    "Statistic", "TimelineEvent", "NewsItem", "Myth", "ExpertOpinion",
    "Reference", "PodcastAngle",
    # topics
    "RelatedTopic", "TopicAnalysis", "TopicScores", "TopicSearchRequest",
    "TrendingTopic",
    # library
    "Folder", "FolderCreate", "FolderUpdate", "Tag", "TagCreate", "TagUpdate",
    # chat
    "ChatMessage", "ChatMessageCreate", "ChatSession", "ChatSessionCreate", "ChatTurn",
    # notes
    "Note", "NoteAnchor", "NoteCreate", "NoteUpdate",
    # ledger / activity
    "ActivityEntry", "CreditBalance", "CreditTransaction",
]
