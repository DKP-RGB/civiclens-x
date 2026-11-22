"""Shared Literal types mirroring the frontend domain types."""

from typing import Literal

IncidentCategory = Literal[
    "potholes",
    "waterlogging",
    "garbage",
    "drainage",
    "road_damage",
    "other",
]

RiskCategory = Literal["waterlogging", "road_deterioration"]
RiskLevel = Literal["low", "moderate", "high", "critical"]

ComplaintStatus = Literal[
    "submitted",
    "under_review",
    "inspection_scheduled",
    "in_progress",
    "resolved",
]

Priority = Literal["low", "medium", "high", "urgent"]
DrainageCondition = Literal["poor", "fair", "good"]
TimelineActor = Literal["citizen", "authority", "system"]

COMPLAINT_STATUS_SEQUENCE: tuple[ComplaintStatus, ...] = (
    "submitted",
    "under_review",
    "inspection_scheduled",
    "in_progress",
    "resolved",
)

STATUS_LABELS: dict[ComplaintStatus, str] = {
    "submitted": "Submitted",
    "under_review": "Under review",
    "inspection_scheduled": "Inspection scheduled",
    "in_progress": "In progress",
    "resolved": "Resolved",
}

STEP_NOTES: dict[ComplaintStatus, str] = {
    "submitted": "Complaint received, validated and geo-tagged to a 250 m grid cell.",
    "under_review": "Zone office reviewing the report and linked risk context.",
    "inspection_scheduled": "Field inspection scheduled with the responsible department.",
    "in_progress": "Maintenance crew assigned and work order opened.",
    "resolved": "Work completed and marked resolved by the authority.",
}

DEPARTMENT_BY_CATEGORY: dict[IncidentCategory, str] = {
    "potholes": "Roads & Bridges Department",
    "waterlogging": "Stormwater & Drainage Cell",
    "garbage": "Solid Waste Management",
    "drainage": "Stormwater & Drainage Cell",
    "road_damage": "Roads & Bridges Department",
    "other": "Indore Municipal Corporation — Zone Office",
}
