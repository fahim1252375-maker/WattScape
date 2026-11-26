package com.wattscape.spatial;

import com.wattscape.common.ApiException;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class SpatialGeometryValidatorTest {
    @Test void acceptsClosedPolygonWhenEquivalentCoordinatesUseDifferentNumberTypes() {
        Map<String,Object> geometry=Map.of("type","Polygon","coordinates",List.of(List.of(
            List.of(0,0),List.of(5,0),List.of(5,5),List.of(0,5),List.of(0.0,0.0))));
        assertDoesNotThrow(()->SpatialGeometryValidator.validate("room",geometry));
    }

    @Test void rejectsOpenPolygonRing() {
        Map<String,Object> geometry=Map.of("type","Polygon","coordinates",List.of(List.of(
            List.of(0,0),List.of(5,0),List.of(5,5),List.of(0,5))));
        assertThrows(ApiException.class,()->SpatialGeometryValidator.validate("room",geometry));
    }

    @Test void acceptsThreeDimensionalAssetPointAndRejectsPolygonForAssets() {
        assertDoesNotThrow(()->SpatialGeometryValidator.validate("asset",Map.of("type","Point","coordinates",List.of(1,2,3))));
        assertThrows(ApiException.class,()->SpatialGeometryValidator.validate("asset",Map.of("type","Polygon","coordinates",List.of(List.of(List.of(0,0),List.of(1,0),List.of(1,1),List.of(0,0))))));
    }

    @Test void rejectsNonFiniteAndExcessiveCoordinates() {
        assertThrows(ApiException.class,()->SpatialGeometryValidator.validate("asset",Map.of("type","Point","coordinates",List.of(Double.NaN,2))));
        assertThrows(ApiException.class,()->SpatialGeometryValidator.validate("asset",Map.of("type","Point","coordinates",List.of(1_000_001,2))));
    }
}
