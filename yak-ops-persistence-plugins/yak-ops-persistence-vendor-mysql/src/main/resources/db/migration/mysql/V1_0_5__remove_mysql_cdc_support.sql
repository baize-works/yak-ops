-- Remove runtime metadata and allocation state for the retired MySQL CDC connector.
DELETE FROM `t_yak_ops_connector_param_meta`
WHERE `type` = 'connector'
  AND `connector_name` = 'MySQL-CDC';

DROP TABLE IF EXISTS `t_yak_ops_cdc_server_id_allocation`;
DROP TABLE IF EXISTS `t_yak_ops_cdc_server_id_pool`;
