package org.apache.seatunnel.plugin.datasource.api.jdbc;

import io.baize.flow.plugin.spi.datasource.ConnectionParam;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class ServerIdManager {

    private final JdbcConnectionProvider jdbcConnectionProvider;
    private final ConnectionParam connectionParam;

    public ServerIdManager(JdbcConnectionProvider jdbcConnectionProvider, ConnectionParam connectionParam) {
        this.jdbcConnectionProvider = jdbcConnectionProvider;
        this.connectionParam = connectionParam;
    }

    /**
     * Allocate server-ids for a job
     */
    public List<Integer> allocate(String jobId, int parallelism) throws SQLException {
        if (parallelism <= 0) throw new IllegalArgumentException("Parallelism must be > 0");

        try (Connection conn = jdbcConnectionProvider.getConnection(this.connectionParam)) {
            conn.setAutoCommit(false);

            // Check if already allocated
            try (PreparedStatement checkPs = conn.prepareStatement(
                    "SELECT server_id FROM cdc_server_ids WHERE job_id = ?")) {
                checkPs.setString(1, jobId);
                ResultSet rs = checkPs.executeQuery();
                List<Integer> existing = new ArrayList<>();
                while (rs.next()) existing.add(rs.getInt(1));
                if (!existing.isEmpty()) {
                    conn.commit();
                    return existing;
                }
            }

            // Allocate new ids
            List<Integer> allocated = new ArrayList<>();
            try (PreparedStatement selectPs = conn.prepareStatement(
                    "SELECT server_id FROM cdc_server_ids WHERE job_id IS NULL ORDER BY server_id FOR UPDATE LIMIT ?")) {
                selectPs.setInt(1, parallelism);
                ResultSet rs = selectPs.executeQuery();
                while (rs.next()) allocated.add(rs.getInt(1));
            }

            if (allocated.size() < parallelism) {
                conn.rollback();
                throw new RuntimeException("Not enough available server-ids");
            }

            // Mark as used
            try (PreparedStatement updatePs = conn.prepareStatement(
                    "UPDATE cdc_server_ids SET job_id=?, allocated_at=NOW() WHERE server_id=?")) {
                for (Integer id : allocated) {
                    updatePs.setString(1, jobId);
                    updatePs.setInt(2, id);
                    updatePs.addBatch();
                }
                updatePs.executeBatch();
            }

            conn.commit();
            return allocated;
        }
    }
}

