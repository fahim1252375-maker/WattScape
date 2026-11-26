package com.wattscape.spatial;

import com.wattscape.common.ApiException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

final class SpatialGeometryValidator {
    private SpatialGeometryValidator() {}

    static void validate(String entityType, Map<String,Object> geometry) {
        if (geometry == null) throw ApiException.badRequest("Geometry is required");
        Object rawType=geometry.get("type"), rawCoordinates=geometry.get("coordinates");
        if (geometry.size()!=2 || !(rawType instanceof String geometryType) || !(rawCoordinates instanceof List<?> coordinates) || coordinates.isEmpty())
            throw ApiException.badRequest("Geometry must include only a valid type and non-empty coordinates");
        if (entityType.equals("asset") && !geometryType.equals("Point"))
            throw ApiException.badRequest("Asset geometry must be a GeoJSON Point");
        if (entityType.equals("room") && !List.of("Polygon","MultiPolygon").contains(geometryType))
            throw ApiException.badRequest("Room geometry must be a GeoJSON Polygon or MultiPolygon");
        List<Double> numbers=new ArrayList<>(); collectNumbers(coordinates,numbers);
        if (numbers.size()<2 || numbers.size()>20000 || numbers.stream().anyMatch(n->!Double.isFinite(n)||Math.abs(n)>1_000_000))
            throw ApiException.badRequest("Geometry coordinates are invalid or exceed the supported size");
        if (entityType.equals("asset") && (coordinates.size()<2 || coordinates.size()>3 || coordinates.stream().anyMatch(value->!(value instanceof Number))))
            throw ApiException.badRequest("Point geometry supports two or three numeric coordinates");
        if (entityType.equals("room") && !hasValidPolygonRings(geometryType,coordinates))
            throw ApiException.badRequest("Polygon geometry must contain closed rings with at least four numeric positions");
    }

    private static boolean hasValidPolygonRings(String type,List<?> coordinates) {
        List<?> polygons=type.equals("Polygon")?List.of(coordinates):coordinates;
        for(Object polygon:polygons) {
            if(!(polygon instanceof List<?> rings)||rings.isEmpty()) return false;
            for(Object ringObject:rings) {
                if(!(ringObject instanceof List<?> ring)||ring.size()<4) return false;
                Integer dimensions=null;
                for(Object positionObject:ring) {
                    if(!(positionObject instanceof List<?> position)||position.size()<2||position.size()>3||position.stream().anyMatch(value->!(value instanceof Number))) return false;
                    if(dimensions==null) dimensions=position.size();
                    else if(dimensions!=position.size()) return false;
                }
                if(!samePosition(ring.get(0),ring.get(ring.size()-1))) return false;
            }
        }
        return true;
    }

    private static boolean samePosition(Object first,Object last) {
        if (!(first instanceof List<?> a) || !(last instanceof List<?> b) || a.size()!=b.size()) return false;
        for (int i=0;i<a.size();i++) {
            if (!(a.get(i) instanceof Number x) || !(b.get(i) instanceof Number y)) return false;
            if (Double.compare(x.doubleValue(),y.doubleValue())!=0) return false;
        }
        return true;
    }

    private static void collectNumbers(Object value,List<Double> out) {
        if(value instanceof Number n) out.add(n.doubleValue());
        else if(value instanceof List<?> list) for(Object item:list) collectNumbers(item,out);
    }
}
