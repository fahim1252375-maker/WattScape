package com.wattscape.site;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.testcontainers.utility.MountableFile;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@Testcontainers(disabledWithoutDocker = true)
class ScratchRestoreDrillIntegrationTest {
    private static final String USER = "scratch_user";
    private static final String PASSWORD = "scratch_password_only";
    private static final String SOURCE_DB = "scratch_source";
    private static final String DUMP_IN_CONTAINER = "/tmp/wattscape-scratch.dump";

    @org.testcontainers.junit.jupiter.Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17.6-alpine")
        .withDatabaseName(SOURCE_DB)
        .withUsername(USER)
        .withPassword(PASSWORD)
        .withTmpFs(Map.of("/var/lib/postgresql/data", "rw,noexec,nosuid,size=512m"));

    @Test
    void actualMigrationsAndCustomDumpRestoreAreVerifiedInDisposableScratchCluster() throws Exception {
        Instant started = Instant.now();
        Flyway.configure().dataSource(POSTGRES.getJdbcUrl(), USER, PASSWORD)
            .locations("classpath:db/migration").load().migrate();
        String sourceUrl = POSTGRES.getJdbcUrl();
        UUID tenantA = UUID.randomUUID();
        UUID tenantB = UUID.randomUUID();
        Instant now = Instant.now();
        try (Connection source = DriverManager.getConnection(sourceUrl, USER, PASSWORD)) {
            insertTenant(source, tenantA, "Scratch Tenant A", "SCR-A", now);
            insertTenant(source, tenantB, "Scratch Tenant B", "SCR-B", now);
        }
        Snapshot before = snapshot(sourceUrl);
        assertEquals(2, before.organizations());
        assertEquals(2, before.sites());

        org.testcontainers.containers.Container.ExecResult dumpResult = POSTGRES.execInContainer(
            "pg_dump", "--username=" + USER, "--dbname=" + SOURCE_DB,
            "--format=custom", "--file=" + DUMP_IN_CONTAINER);
        assertEquals(0, dumpResult.getExitCode(), dumpResult.getStderr());
        Path hostDump = Files.createTempFile("wattscape-scratch-restore-", ".dump");
        Path hostSidecar = Path.of(hostDump + ".sha256");
        try {
            POSTGRES.copyFileFromContainer(DUMP_IN_CONTAINER, hostDump.toString());
            byte[] dumpBytes = Files.readAllBytes(hostDump);
            assertTrue(dumpBytes.length > 0, "pg_dump must produce a nonempty custom archive");
            String sha256 = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(dumpBytes));
            POSTGRES.copyFileToContainer(MountableFile.forHostPath(hostDump), DUMP_IN_CONTAINER);
            Path script = findRestoreScript();
            assertTrue(Files.isRegularFile(script), "restore drill script must be present; user.dir=" + System.getProperty("user.dir"));
            POSTGRES.copyFileToContainer(MountableFile.forHostPath(script), "/tmp/restore-drill-scratch.sh");
            POSTGRES.copyFileToContainer(MountableFile.forHostPath(writeSidecar(hostDump, sha256)), DUMP_IN_CONTAINER + ".sha256");

            org.testcontainers.containers.Container.ExecResult missingConfirm = runScript("/tmp/restore-drill-scratch.sh", DUMP_IN_CONTAINER, false, "", false);
            assertEquals(0, missingConfirm.getExitCode(), missingConfirm.getStderr());
            assertTrue(missingConfirm.getStdout().contains("SCRIPT_EXIT=1"));
            assertTrue(missingConfirm.getStderr().contains("Refusing: set SCRATCH_PG_CONFIRM"), missingConfirm.getStderr());

            Path tampered = Files.createTempFile("wattscape-scratch-tampered-", ".dump");
            Path tamperedSidecar = Path.of(tampered + ".sha256");
            try {
                Files.write(tampered, new byte[]{1, 2, 3, 4, 5});
                POSTGRES.copyFileToContainer(MountableFile.forHostPath(tampered), "/tmp/wattscape-wrong.dump");
                POSTGRES.copyFileToContainer(MountableFile.forHostPath(writeSidecar(tampered, sha256)), "/tmp/wattscape-wrong.dump.sha256");
                org.testcontainers.containers.Container.ExecResult wrongChecksum = runScript("/tmp/restore-drill-scratch.sh", "/tmp/wattscape-wrong.dump", true, "", false);
                assertEquals(0, wrongChecksum.getExitCode(), wrongChecksum.getStderr());
                assertTrue(wrongChecksum.getStdout().contains("SCRIPT_EXIT=1"));
                assertTrue(wrongChecksum.getStderr().contains("SHA-256 mismatch"));
            } finally {
                Files.deleteIfExists(tampered);
                Files.deleteIfExists(tamperedSidecar);
            }

            String fixedStamp = "20991231T235959Z";
            String fixedTarget = "wattscape_restore_drill_" + fixedStamp;
            try (Connection admin = DriverManager.getConnection(sourceUrl.replace("/" + SOURCE_DB, "/postgres"), USER, PASSWORD);
                 Statement create = admin.createStatement()) {
                create.execute("CREATE DATABASE \"" + fixedTarget + "\"");
            }
            try (Connection admin = DriverManager.getConnection(sourceUrl.replace("/" + SOURCE_DB, "/postgres"), USER, PASSWORD);
                 PreparedStatement query = admin.prepareStatement("SELECT count(*) FROM pg_database WHERE datname=?")) {
                query.setString(1, fixedTarget);
                try (ResultSet result = query.executeQuery()) { result.next(); assertEquals(1, result.getInt(1)); }
            }
            org.testcontainers.containers.Container.ExecResult existingTarget = POSTGRES.execInContainer("sh", "-c",
                "export SCRATCH_PG_HOST=127.0.0.1 SCRATCH_PG_PORT=5432 SCRATCH_PG_USER=" + USER +
                " PGPASSWORD=" + PASSWORD + " SCRATCH_PG_CONFIRM=I_CONFIRM_SCRATCH_SERVER SCRATCH_PG_STAMP=" + fixedStamp + "; " +
                "bash /tmp/restore-drill-scratch.sh " + DUMP_IN_CONTAINER + "; result=$?; echo SCRIPT_EXIT=$result; exit 0");
            assertTrue(existingTarget.getStdout().contains("SCRIPT_EXIT=1"), existingTarget.getStdout() + existingTarget.getStderr());
            assertTrue(existingTarget.getStderr().contains("already exists"), existingTarget.getStderr());

            org.testcontainers.containers.Container.ExecResult activeName = POSTGRES.execInContainer("sh", "-c",
                "export SCRATCH_PG_HOST=127.0.0.1 SCRATCH_PG_PORT=5432 SCRATCH_PG_USER=" + USER +
                " PGPASSWORD=" + PASSWORD + " SCRATCH_PG_CONFIRM=I_CONFIRM_SCRATCH_SERVER SCRATCH_PG_STAMP=" + fixedStamp +
                " ACTIVE_DB_NAME=" + fixedTarget + "; bash /tmp/restore-drill-scratch.sh " + DUMP_IN_CONTAINER +
                "; result=$?; echo SCRIPT_EXIT=$result; exit 0");
            assertTrue(activeName.getStdout().contains("SCRIPT_EXIT=1"), activeName.getStdout());
            assertTrue(activeName.getStderr().contains("collides with the active database"), activeName.getStderr());

            Thread.sleep(1_100);
            org.testcontainers.containers.Container.ExecResult restore = runScript("/tmp/restore-drill-scratch.sh", DUMP_IN_CONTAINER, true, "", true);
            assertEquals(0, restore.getExitCode(), restore.getStderr() + restore.getStdout());
            String targetDb = restore.getStdout().lines()
                .filter(line -> line.startsWith("Drill complete. Scratch database retained for inspection: "))
                .map(line -> line.substring(line.lastIndexOf(' ') + 1)).findFirst().orElseThrow();
            String targetUrl = sourceUrl.replace("/" + SOURCE_DB, "/" + targetDb);
            Flyway.configure().dataSource(targetUrl, USER, PASSWORD)
                .locations("classpath:db/migration").load().validate();
            List<String> versions;
            try (Connection target = DriverManager.getConnection(targetUrl, USER, PASSWORD);
                 Statement statement = target.createStatement();
                 ResultSet rows = statement.executeQuery("SELECT version FROM flyway_schema_history WHERE success ORDER BY installed_rank")) {
                var collected = new java.util.ArrayList<String>();
                while (rows.next()) collected.add(rows.getString(1));
                versions = List.copyOf(collected);
            }
            assertEquals(List.of("1", "2", "3", "4", "5", "6"), versions);
            assertEquals(before, snapshot(targetUrl), "restored table counts and representative tenant records must match");
            assertEquals(before, snapshot(sourceUrl), "source scratch database must remain unchanged");
            assertTenantIsolation(targetUrl, tenantA, tenantB);
            System.out.println("SCRATCH_RESTORE_DRILL PASS dumpSha256=" + sha256 +
                " migrations=" + versions.size() + " tenants=2 elapsedMs=" + Duration.between(started, Instant.now()).toMillis());
            System.out.println("SCRATCH_RESTORE_NEGATIVE_TESTS PASS missingConfirmation wrongChecksum existingTarget activeDatabaseName");
        } finally {
            Files.deleteIfExists(hostDump);
            Files.deleteIfExists(hostSidecar);
        }
    }

    private static org.testcontainers.containers.Container.ExecResult runScript(String script, String dump, boolean confirmation, String activeDb, boolean captureNormalExit) throws Exception {
        String command = "export SCRATCH_PG_HOST=127.0.0.1 SCRATCH_PG_PORT=5432 SCRATCH_PG_USER=" + USER +
            " PGPASSWORD=" + PASSWORD + (confirmation ? " SCRATCH_PG_CONFIRM=I_CONFIRM_SCRATCH_SERVER" : "") +
            (activeDb.isEmpty() ? "" : " ACTIVE_DB_NAME=" + activeDb) + "; bash " + script + " " + dump;
        if (captureNormalExit) return POSTGRES.execInContainer("sh", "-c", command);
        return POSTGRES.execInContainer("sh", "-c", command + "; result=$?; echo SCRIPT_EXIT=$result; exit 0");
    }

    private static Path findRestoreScript() {
        Path current = Path.of(System.getProperty("user.dir")).toAbsolutePath();
        while (current != null) {
            Path backendRelative = current.resolve("scripts/restore-drill-scratch.sh");
            if (Files.isRegularFile(backendRelative)) return backendRelative;
            Path repoRelative = current.resolve("backend/scripts/restore-drill-scratch.sh");
            if (Files.isRegularFile(repoRelative)) return repoRelative;
            current = current.getParent();
        }
        return Path.of("scripts/restore-drill-scratch.sh").toAbsolutePath();
    }

    private static Path writeSidecar(Path dump, String digest) throws Exception {
        Path sidecar = Path.of(dump + ".sha256");
        Files.writeString(sidecar, digest + "  " + dump.getFileName() + System.lineSeparator());
        return sidecar;
    }

    private static void insertTenant(Connection connection, UUID organizationId, String name, String code, Instant now) throws Exception {
        try (PreparedStatement organization = connection.prepareStatement(
                "INSERT INTO organizations(id,name,legal_name,created_at,updated_at) VALUES (?,?,?,?,?)");
             PreparedStatement site = connection.prepareStatement(
                "INSERT INTO sites(id,organization_id,name,code,time_zone,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)")) {
            Timestamp timestamp = Timestamp.from(now);
            organization.setObject(1, organizationId); organization.setString(2, name); organization.setString(3, name + " LLC");
            organization.setTimestamp(4, timestamp); organization.setTimestamp(5, timestamp); organization.executeUpdate();
            site.setObject(1, UUID.randomUUID()); site.setObject(2, organizationId); site.setString(3, name + " Site");
            site.setString(4, code); site.setString(5, "UTC"); site.setString(6, "operational");
            site.setTimestamp(7, timestamp); site.setTimestamp(8, timestamp); site.executeUpdate();
        }
    }

    private static Snapshot snapshot(String jdbcUrl) throws Exception {
        try (Connection connection = DriverManager.getConnection(jdbcUrl, USER, PASSWORD);
             Statement statement = connection.createStatement()) {
            int organizations = scalar(statement, "SELECT count(*) FROM organizations");
            int sites = scalar(statement, "SELECT count(*) FROM sites");
            var tenantRows = new java.util.ArrayList<String>();
            try (ResultSet rows = statement.executeQuery("SELECT o.name || ':' || count(s.id) FROM organizations o LEFT JOIN sites s ON s.organization_id=o.id GROUP BY o.id,o.name ORDER BY o.name")) {
                while (rows.next()) tenantRows.add(rows.getString(1));
            }
            var siteRows = new java.util.ArrayList<String>();
            try (ResultSet rows = statement.executeQuery("SELECT code FROM sites ORDER BY code")) {
                while (rows.next()) siteRows.add(rows.getString(1));
            }
            return new Snapshot(organizations, sites, List.copyOf(tenantRows), List.copyOf(siteRows));
        }
    }

    private static int scalar(Statement statement, String sql) throws Exception {
        try (ResultSet rows = statement.executeQuery(sql)) { rows.next(); return rows.getInt(1); }
    }

    private static void assertTenantIsolation(String jdbcUrl, UUID tenantA, UUID tenantB) throws Exception {
        try (Connection connection = DriverManager.getConnection(jdbcUrl, USER, PASSWORD);
             PreparedStatement statement = connection.prepareStatement("SELECT count(*) FROM sites WHERE organization_id=?")) {
            statement.setObject(1, tenantA); try (ResultSet rows = statement.executeQuery()) { rows.next(); assertEquals(1, rows.getInt(1)); }
            statement.setObject(1, tenantB); try (ResultSet rows = statement.executeQuery()) { rows.next(); assertEquals(1, rows.getInt(1)); }
        }
    }

    private record Snapshot(int organizations, int sites, List<String> tenants, List<String> siteCodes) { }
}
