package com.wattscape.workorder;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Min;
import java.time.Instant;
import java.util.UUID;

public final class WorkOrderDtos {
    private WorkOrderDtos() {}
    public record CreateRequest(@NotBlank @Size(max=180) String title,@Size(max=4000) String description,
        @Pattern(regexp="low|medium|high|urgent") String priority,UUID assetId,Instant dueAt,UUID assigneeMemberId) {}
    public record UpdateRequest(@NotNull @Min(1) Integer expectedVersion,
        @Pattern(regexp="open|triaged|in_progress|blocked|completed|cancelled") String status,
        @Pattern(regexp="low|medium|high|urgent") String priority,Instant dueAt,UUID assigneeMemberId,boolean clearAssignee,boolean clearDueAt) {}
    public record EventResponse(UUID id,String eventType,String fromStatus,String toStatus,String actorSubject,java.util.Map<String,Object> details,Instant createdAt) {
        static EventResponse from(WorkOrderEvent e){return new EventResponse(e.getId(),e.getEventType(),e.getFromStatus(),e.getToStatus(),e.getActorSubject(),e.getDetails(),e.getCreatedAt());}
    }
    public record Response(UUID id,UUID siteId,UUID assetId,String title,String description,String priority,String status,
        Instant dueAt,String assigneeSubject,String assigneeName,String createdBy,String updatedBy,int version,Instant createdAt,Instant updatedAt) {
        static Response from(WorkOrder w){return new Response(w.getId(),w.getSiteId(),w.getAssetId(),w.getTitle(),w.getDescription(),w.getPriority(),w.getStatus(),w.getDueAt(),w.getAssigneeSubject(),w.getAssigneeName(),w.getCreatedBy(),w.getUpdatedBy(),w.getVersion(),w.getCreatedAt(),w.getUpdatedAt());}
    }
}
