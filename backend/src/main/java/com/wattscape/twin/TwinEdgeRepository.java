package com.wattscape.twin;
import org.springframework.data.jpa.repository.JpaRepository; import org.springframework.data.jpa.repository.Query; import org.springframework.data.repository.query.Param; import java.util.List; import java.util.UUID;
public interface TwinEdgeRepository extends JpaRepository<TwinEdge,UUID> { @Query("select e from TwinEdge e where e.organizationId=:org and (e.sourceNodeId in :ids or e.targetNodeId in :ids) order by e.edgeType") List<TwinEdge> findForNodes(@Param("org") UUID org,@Param("ids") List<UUID> ids); }
