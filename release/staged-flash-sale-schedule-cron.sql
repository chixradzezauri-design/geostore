-- Run only after installing and validating staged-flash-sale-schedule.sql.
-- One starter, one existing expiry worker; no changes to the expiry job.
SELECT cron.schedule('geostore_start_scheduled_flash_sales','* * * * *','SELECT private.run_due_flash_sale_schedule();');
